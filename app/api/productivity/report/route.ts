import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing authorization header" }, { status: 401 })
        }

        const token = authHeader.replace("Bearer ", "")

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
        })

        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const date = req.nextUrl.searchParams.get("date")
        if (!date) {
            return NextResponse.json({ error: "Missing date parameter" }, { status: 400 })
        }

        // Fetch productivity session for this date
        const { data: session } = await supabase
            .from("productivity_sessions")
            .select("*")
            .eq("user_id", user.id)
            .eq("date", date)
            .single()

        let applications: { app_name: string; duration_minutes: number }[] = []
        let websites: { domain: string; duration_minutes: number }[] = []

        if (session) {
            // Fetch app usage
            const { data: apps } = await supabase
                .from("app_usage")
                .select("app_name, duration_minutes")
                .eq("session_id", session.id)
                .order("duration_minutes", { ascending: false })

            applications = apps || []

            // Fetch website usage
            const { data: sites } = await supabase
                .from("website_usage")
                .select("domain, duration_minutes")
                .eq("session_id", session.id)
                .order("duration_minutes", { ascending: false })

            websites = sites || []
        }

        // Fetch existing study sessions for this date
        const dayStart = new Date(date + "T00:00:00")
        const dayEnd = new Date(date + "T23:59:59")

        const { data: studySessions } = await supabase
            .from("study_sessions")
            .select("*")
            .eq("user_id", user.id)
            .gte("started_at", dayStart.toISOString())
            .lte("started_at", dayEnd.toISOString())

        // Calculate existing metrics
        let totalStudyMin = 0
        let totalFocusedMin = 0
        let totalDrowsyMin = 0
        let totalDistractedMin = 0
        let avgFocusScore = 0

        if (studySessions && studySessions.length > 0) {
            for (const s of studySessions) {
                totalStudyMin += (s.duration_ms || 0) / 60000
                totalFocusedMin += (s.focused_time_ms || 0) / 60000
                totalDrowsyMin += (s.drowsy_time_ms || 0) / 60000
                totalDistractedMin += ((s.head_turned_time_ms || 0) + (s.face_missing_time_ms || 0) + (s.unauthorized_time_ms || 0)) / 60000
            }
            avgFocusScore = Math.round(
                studySessions.reduce((sum: number, s: any) => sum + (s.focus_score || 0), 0) / studySessions.length
            )
        }

        const totalActiveMin = session?.total_active_minutes || 0
        const idleMin = session?.idle_minutes || 0
        const focusTime = totalActiveMin - idleMin
        const appTotalMin = applications.reduce((s, a) => s + a.duration_minutes, 0)
        const webTotalMin = websites.reduce((s, w) => s + w.duration_minutes, 0)

        // Productivity score: ratio of focus vs total tracked time
        const totalTracked = focusTime + idleMin
        const productivityScore = totalTracked > 0 ? Math.round((focusTime / totalTracked) * 100) : 0

        const report = {
            date,
            focus_time: focusTime,
            distraction_time: idleMin,
            total_active_minutes: totalActiveMin,
            idle_minutes: idleMin,
            productivity_score: productivityScore,
            top_apps: applications.slice(0, 10),
            top_websites: websites.slice(0, 10),
            all_apps: applications,
            all_websites: websites,
            existing_metrics: {
                study_sessions_count: studySessions?.length || 0,
                total_study_minutes: Math.round(totalStudyMin),
                total_focused_minutes: Math.round(totalFocusedMin),
                total_drowsy_minutes: Math.round(totalDrowsyMin),
                total_distracted_minutes: Math.round(totalDistractedMin),
                avg_focus_score: avgFocusScore,
            },
        }

        return NextResponse.json(report)
    } catch (error) {
        console.error("Report error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
