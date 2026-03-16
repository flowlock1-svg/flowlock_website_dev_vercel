-- Student Self-Concentration Monitoring System Schema

-- 1. device_sessions: Tracks an active monitoring session from a specific device
CREATE TABLE public.device_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_type TEXT NOT NULL CHECK (device_type IN ('windows', 'android', 'chrome')),
    device_id TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    focus_score INTEGER,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed'))
);

-- Enable RLS for device_sessions
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own device sessions"
    ON public.device_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device sessions"
    ON public.device_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device sessions"
    ON public.device_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- 2. activity_logs: Unifies app usage (Windows/Android) and browser usage (Chrome)
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.device_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('app', 'browser', 'idle')),
    app_name TEXT,
    window_title TEXT,
    domain TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER NOT NULL,
    classification TEXT NOT NULL DEFAULT 'neutral' CHECK (classification IN ('study', 'neutral', 'distraction', 'idle'))
);

-- Enable RLS for activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own activity logs"
    ON public.activity_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. productivity_rules: User-defined rules for classifying apps and domains
CREATE TABLE public.productivity_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('app', 'domain')),
    match_string TEXT NOT NULL,
    classification TEXT NOT NULL CHECK (classification IN ('study', 'neutral', 'distraction')),
    UNIQUE(user_id, rule_type, match_string)
);

-- Enable RLS for productivity_rules
ALTER TABLE public.productivity_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own rules"
    ON public.productivity_rules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rules"
    ON public.productivity_rules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules"
    ON public.productivity_rules FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules"
    ON public.productivity_rules FOR DELETE
    USING (auth.uid() = user_id);

-- 4. daily_summaries: Daily aggregations per user
CREATE TABLE public.daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    study_seconds INTEGER DEFAULT 0,
    distraction_seconds INTEGER DEFAULT 0,
    neutral_seconds INTEGER DEFAULT 0,
    idle_seconds INTEGER DEFAULT 0,
    overall_focus_score INTEGER,
    UNIQUE(user_id, date)
);

-- Enable RLS for daily_summaries
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own daily summaries"
    ON public.daily_summaries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily summaries"
    ON public.daily_summaries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily summaries"
    ON public.daily_summaries FOR INSERT
    WITH CHECK (auth.uid() = user_id);


-- 5. Calculate Focus Score Trigger
-- This function computes the focus score when a device session is marked 'completed'
CREATE OR REPLACE FUNCTION calculate_focus_score()
RETURNS TRIGGER AS $$
DECLARE
    total_study_seconds INT := 0;
    total_distraction_seconds INT := 0;
    total_idle_seconds INT := 0;
    total_duration_seconds INT := 0;
    computed_score INT := 0;
BEGIN
    -- Only run if status changed to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        
        -- Aggregate durations for this session
        SELECT 
            COALESCE(SUM(CASE WHEN classification = 'study' THEN duration_seconds ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN classification = 'distraction' THEN duration_seconds ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN classification = 'idle' THEN duration_seconds ELSE 0 END), 0),
            COALESCE(SUM(duration_seconds), 0)
        INTO 
            total_study_seconds, total_distraction_seconds, total_idle_seconds, total_duration_seconds
        FROM public.activity_logs
        WHERE session_id = NEW.id;

        IF total_duration_seconds > 0 THEN
            -- Base score logic: 
            -- Start with 50 as baseline if totally neutral? Or base it purely on ratios.
            -- Let's define the score out of 100 based on the proportion of study vs distraction.
            -- A purely neutral session might be 50.
            -- Max score 100, min 0.
            
            computed_score := 50 
                            + ((total_study_seconds::FLOAT / total_duration_seconds) * 50) 
                            - ((total_distraction_seconds::FLOAT / total_duration_seconds) * 50)
                            - ((total_idle_seconds::FLOAT / total_duration_seconds) * 20);
            
            -- Clamp between 0 and 100
            IF computed_score > 100 THEN
                computed_score := 100;
            ELSIF computed_score < 0 THEN
                computed_score := 0;
            END IF;

            NEW.focus_score := computed_score;
            
            -- Also calculate the duration if not provided
            IF NEW.ended_at IS NULL THEN
                NEW.ended_at := NOW();
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_calculate_focus_score
BEFORE UPDATE ON public.device_sessions
FOR EACH ROW
EXECUTE FUNCTION calculate_focus_score();


-- 6. RPC Function to Update Daily Summaries
-- This can be called from the client periodically, or run via trigger on activity_logs
CREATE OR REPLACE FUNCTION update_daily_summary(p_user_id UUID, p_date DATE)
RETURNS void AS $$
DECLARE
    total_study INT := 0;
    total_distraction INT := 0;
    total_neutral INT := 0;
    total_idle INT := 0;
    total_duration INT := 0;
    overall_score INT := 0;
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN classification = 'study' THEN duration_seconds ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN classification = 'distraction' THEN duration_seconds ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN classification = 'neutral' THEN duration_seconds ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN classification = 'idle' THEN duration_seconds ELSE 0 END), 0)
    INTO 
        total_study, total_distraction, total_neutral, total_idle
    FROM public.activity_logs
    WHERE user_id = p_user_id 
      AND start_time::DATE = p_date;

    total_duration := total_study + total_distraction + total_neutral + total_idle;

    IF total_duration > 0 THEN
        overall_score := 50 
                       + ((total_study::FLOAT / total_duration) * 50) 
                       - ((total_distraction::FLOAT / total_duration) * 50)
                       - ((total_idle::FLOAT / total_duration) * 20);

        IF overall_score > 100 THEN overall_score := 100; END IF;
        IF overall_score < 0 THEN overall_score := 0; END IF;
    END IF;

    INSERT INTO public.daily_summaries (user_id, date, study_seconds, distraction_seconds, neutral_seconds, idle_seconds, overall_focus_score)
    VALUES (p_user_id, p_date, total_study, total_distraction, total_neutral, total_idle, overall_score)
    ON CONFLICT (user_id, date) 
    DO UPDATE SET 
        study_seconds = EXCLUDED.study_seconds,
        distraction_seconds = EXCLUDED.distraction_seconds,
        neutral_seconds = EXCLUDED.neutral_seconds,
        idle_seconds = EXCLUDED.idle_seconds,
        overall_focus_score = EXCLUDED.overall_focus_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
