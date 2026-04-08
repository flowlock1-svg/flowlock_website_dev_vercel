import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function PATCH(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get("authorization") ?? request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as {
      extension_connected?: boolean
      agent_connected?: boolean
      agent_last_ping_at?: string
    }

    const updates: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }
    if (typeof body.extension_connected === "boolean")
      updates.extension_connected = body.extension_connected
    if (typeof body.agent_connected === "boolean")
      updates.agent_connected = body.agent_connected
    if (body.agent_last_ping_at !== undefined)
      updates.agent_last_ping_at = body.agent_last_ping_at

    const { error: upsertError } = await supabase
      .from("user_preferences")
      .upsert(updates, { onConflict: "user_id" })

    if (upsertError) {
      console.error("[connection-status] upsert error:", upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[connection-status] unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
