CREATE TABLE IF NOT EXISTS public.distraction_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('website', 'desktop_app')),
    identifier TEXT NOT NULL,
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.distraction_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own vault"
    ON public.distraction_vault
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
