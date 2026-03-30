import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  const { provider } = await params
  
  // Validation
  if (provider !== 'calendar' && provider !== 'youtube') {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const authHeader = request.headers.get("Authorization")
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  const supabaseAuthClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } }
  })

  // Get User from JWT
  const { data: { user }, error: authErr } = await supabaseAuthClient.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get existing integration from DB (Use Service Key or let RLS handle it)
  // Let's use authClient since RLS is 'Users can manage their own integrations' (auth.uid() = user_id)
  const providerName = provider === 'calendar' ? 'google_calendar' : 'google_youtube'

  const { data: integration, error: dbErr } = await supabaseAuthClient
    .from('user_integrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', providerName)
    .single()

  if (dbErr || !integration) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 })
  }

  // Check if Expired
  const now = Date.now()
  if (integration.expires_at && now >= integration.expires_at) {
    if (!integration.refresh_token) {
      return NextResponse.json({ error: 'Token expired and no refresh_token available' }, { status: 401 })
    }

    // Refresh Token via Google
    // Google token endpoint
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: integration.refresh_token,
        }),
      })

      const tokenData = await response.json()
      if (!response.ok || tokenData.error) {
         return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 })
      }

      // Update in DB with Admin Key (to guarantee upsert, or since RLS allows authClient update)
      const newExpiresAt = Date.now() + (tokenData.expires_in - 60) * 1000
      
      const { error: updateErr } = await supabaseAuthClient
        .from('user_integrations')
        .update({
           access_token: tokenData.access_token,
           expires_at: newExpiresAt,
           ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
           updated_at: new Date().toISOString()
        })
        .eq('id', integration.id)

      if (updateErr) throw new Error("Database update failed")

      return NextResponse.json({ access_token: tokenData.access_token })
    } catch (err) {
      return NextResponse.json({ error: 'Internal server error while refreshing' }, { status: 500 })
    }
  }

  return NextResponse.json({ access_token: integration.access_token })
}
