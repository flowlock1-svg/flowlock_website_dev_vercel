import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
    try {
        // Get auth token from Authorization header
        const authHeader = req.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing authorization header" }, { status: 401 })
        }

        const token = authHeader.replace("Bearer ", "")

        // Create authenticated Supabase client
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
        })

        // Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { date, applications, websites, idle_minutes, total_active_minutes } = body

        if (!date) {
            return NextResponse.json({ error: "Missing date field" }, { status: 400 })
        }

        // Upsert productivity session
        const { data: session, error: sessionError } = await supabase
            .from("productivity_sessions")
            .upsert(
                {
                    user_id: user.id,
                    date,
                    total_active_minutes: total_active_minutes || 0,
                    idle_minutes: idle_minutes || 0,
                },
                { onConflict: "user_id,date" }
            )
            .select("id")
            .single()

        if (sessionError) {
            console.error("Session upsert error:", sessionError)
            return NextResponse.json({ error: "Failed to upsert session" }, { status: 500 })
        }

        const sessionId = session.id

        // Delete existing app_usage and website_usage for this session (for re-upload)
        await supabase.from("app_usage").delete().eq("session_id", sessionId)
        await supabase.from("website_usage").delete().eq("session_id", sessionId)

        // Insert app usage
        if (applications && applications.length > 0) {
            const appRows = applications.map((app: { app_name: string; duration_minutes: number }) => ({
                session_id: sessionId,
                app_name: app.app_name,
                duration_minutes: app.duration_minutes,
            }))

            const { error: appError } = await supabase.from("app_usage").insert(appRows)
            if (appError) {
                console.error("App usage insert error:", appError)
            }
        }

        // Insert website usage
        if (websites && websites.length > 0) {
            const webRows = websites.map((site: { domain: string; duration_minutes: number }) => ({
                session_id: sessionId,
                domain: site.domain,
                duration_minutes: site.duration_minutes,
            }))

            const { error: webError } = await supabase.from("website_usage").insert(webRows)
            if (webError) {
                console.error("Website usage insert error:", webError)
            }
        }

        return NextResponse.json({ success: true, session_id: sessionId })
    } catch (error) {
        console.error("Upload error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
