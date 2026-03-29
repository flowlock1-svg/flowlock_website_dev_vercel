import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Server configuration error: GEMINI_API_KEY is not set." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { sessions, type, userName, reportData } = body;

    let prompt = "";

    if (type === "coach") {
      if (!sessions || !Array.isArray(sessions)) {
        return NextResponse.json({ error: "Invalid sessions data" }, { status: 400 });
      }
      prompt = `You are an elite productivity coach analyzing a user's focus data. 
User Name: ${userName || "User"}
Session Data Summary: ${JSON.stringify(sessions.slice(0, 10))}

Return EXACTLY a JSON object with this shape, and NO formatting markdown around it:
{
  "focus_score": (0-100 average),
  "best_focus_window": "time of day",
  "worst_window": "time of day",
  "recommendations": [
    { "title": "insight title 1", "advice": "Max 2 sentences referencing actual numbers." },
    { "title": "insight title 2", "advice": "Max 2 sentences referencing actual numbers." },
    { "title": "insight title 3", "advice": "Max 2 sentences referencing actual numbers." }
  ],
  "encouragement": "1 warm sentence using their name"
}`;

    } else if (type === "heatmap") {
      if (!sessions || !Array.isArray(sessions)) {
        return NextResponse.json({ error: "Invalid sessions data" }, { status: 400 });
      }
      prompt = `You are a friendly data analyst. Look at this session timeline:
User Name: ${userName || "User"}
Session Data Summary: ${JSON.stringify(sessions.slice(0, 10))}

Translate this timeline into human-readable zones. Return EXACTLY a JSON object with this shape:
{
  "peak_distractions": [
    { "zone": "time or description", "description": "1 sentence explaining what happened.", "label": "red or amber" },
    { "zone": "time or description", "description": "1 sentence explaining what happened.", "label": "red or amber" },
    { "zone": "time or description", "description": "1 sentence explaining what happened.", "label": "red or amber" }
  ],
  "deep_focus": [
    { "zone": "time or description", "description": "1 sentence celebrating it.", "label": "green" },
    { "zone": "time or description", "description": "1 sentence celebrating it.", "label": "green" }
  ]
}`;

    } else if (type === "deep_analysis") {
      if (!sessions || !Array.isArray(sessions)) {
        return NextResponse.json({ error: "Invalid sessions data" }, { status: 400 });
      }

      const sessionSummary = sessions.slice(0, 30).map((s: any) => ({
        date: s.started_at ? new Date(s.started_at).toLocaleDateString() : "unknown",
        duration_min: Math.round((s.duration_ms || 0) / 60000),
        focus_score: s.focus_score || 0,
        drowsy_count: s.drowsy_count || 0,
        head_turned_count: s.head_turned_count || 0,
        face_missing_count: s.face_missing_count || 0,
        high_noise_count: s.high_noise_count || 0,
        focused_pct: s.duration_ms > 0 ? Math.round(((s.focused_time_ms || 0) / s.duration_ms) * 100) : 0,
      }))

      const avgScore = sessionSummary.length > 0
        ? Math.round(sessionSummary.reduce((a: number, s: any) => a + s.focus_score, 0) / sessionSummary.length)
        : 0;
      const totalSessions = sessionSummary.length;
      const appData = reportData?.top_apps?.slice(0, 5) || [];
      const webData = reportData?.top_websites?.slice(0, 5) || [];

      prompt = `You are an expert AI productivity coach performing a deep analysis for a student/professional.

User Name: ${userName || "User"}
Total Sessions Analyzed: ${totalSessions}
Average Focus Score: ${avgScore}%
Recent Sessions (newest first): ${JSON.stringify(sessionSummary)}
Top Apps Used: ${JSON.stringify(appData)}
Top Websites Visited: ${JSON.stringify(webData)}

Perform a comprehensive, nuanced analysis. Return EXACTLY this JSON shape with NO markdown or code fences:
{
  "burnout_risk": (integer 0-100, based on avg score, distraction frequency, session frequency),
  "burnout_label": ("Low" if risk<35, "Moderate" if 35-65, "High" if >65),
  "focus_trend": ("improving" | "stable" | "declining"),
  "trend_reason": "1-2 sentences citing specific data points",
  "peak_hours": "e.g. 9 AM – 12 PM (inferred from session start times if available, else give general advice)",
  "distraction_profile": {
    "primary": "most common distraction type name",
    "secondary": "second most common distraction type name",
    "ai_comment": "2 sentences analyzing the distraction patterns and their impact"
  },
  "action_plan": [
    { "icon": "🎯", "title": "Action item title", "advice": "Specific, actionable 2-sentence advice referencing their actual data." },
    { "icon": "⏰", "title": "Action item title", "advice": "Specific, actionable 2-sentence advice." },
    { "icon": "🧠", "title": "Action item title", "advice": "Specific, actionable 2-sentence advice." }
  ],
  "weekly_target": {
    "sessions": (integer, recommended sessions per week),
    "focus_hours": (float, recommended focus hours per week),
    "rationale": "1-2 sentences explaining why this target suits this user's current performance"
  },
  "encouragement": "1 warm, personal sentence using their first name that references something specific about their data"
}`;

    } else if (type === "quick_tip") {
      const s = body.session || {};
      const durationMin = Math.round((s.duration || 0) / 60000);
      const score = s.score || 0;
      const drowsy = s.drowsyCount || 0;
      const headTurned = s.headTurnedCount || 0;
      const faceMissing = s.faceMissingCount || 0;
      const noise = s.highNoiseCount || 0;

      prompt = `You are a brief but insightful productivity coach. A user just finished a focus session.

User: ${userName || "there"}
Duration: ${durationMin} min | Focus Score: ${score}% | Drowsy events: ${drowsy} | Head turned: ${headTurned} | Face missing: ${faceMissing} | Noise alerts: ${noise}

Return EXACTLY this JSON with NO markdown:
{
  "tip": "One single sentence (max 20 words) of actionable advice specific to their session data."
}`;

    } else if (type === "daily_insight") {
      if (!sessions || !Array.isArray(sessions)) {
        return NextResponse.json({ error: "Invalid sessions data" }, { status: 400 });
      }
      const last7 = sessions.slice(-7).map((s: any) => ({
        date: s.started_at ? new Date(s.started_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "unknown",
        time_of_day: s.started_at ? (() => { const h = new Date(s.started_at).getHours(); return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening" })() : "unknown",
        duration_min: Math.round((s.duration_ms || 0) / 60000),
        focus_score: s.focus_score || 0,
        distractions: (s.drowsy_count || 0) + (s.head_turned_count || 0) + (s.face_missing_count || 0),
      }));
      prompt = `You are a warm, insightful productivity coach. The user ${userName || "there"} has the following last 7 study sessions:
${JSON.stringify(last7)}

Generate exactly ONE concise, actionable, personalized study tip (1–2 sentences max). Reference their actual data patterns (e.g. best time of day, focus score trend, distraction spikes). Be encouraging but specific. Sound human and conversational, not robotic.

Return EXACTLY this JSON with NO markdown or code fences:
{ "insight": "Your 1-2 sentence tip here." }`;

    } else {
      return NextResponse.json({ error: "Invalid coach type" }, { status: 400 });
    }

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const rawText = result.text ?? "";
    if (!rawText) {
      return NextResponse.json({ error: "AI returned an empty response" }, { status: 500 });
    }
    const outputText = rawText.trim();
    return NextResponse.json(JSON.parse(outputText));

  } catch (error: any) {
    console.error("AI Coach API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate insights" },
      { status: 500 }
    );
  }
}
