import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  const { provider } = await params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const stateEncoded = searchParams.get("state")
  
  if (error) {
    return NextResponse.redirect(`${request.nextUrl.origin}/dashboard?error=${error}`)
  }
  
  if (!code || !stateEncoded) {
    return NextResponse.redirect(`${request.nextUrl.origin}/dashboard?error=missing_code_or_state`)
  }

  // Decode State
  let stateData: { o: string; u: string; p: string }
  try {
    const decoded = Buffer.from(stateEncoded, 'base64').toString('utf-8')
    stateData = JSON.parse(decoded)
  } catch (err) {
    return NextResponse.redirect(`${request.nextUrl.origin}/dashboard?error=invalid_state`)
  }

  // Cross-check provider
  if (stateData.p !== provider) {
    return NextResponse.redirect(`${request.nextUrl.origin}/dashboard?error=provider_mismatch`)
  }

  const host = request.headers.get("host") || "127.0.0.1:3000"
  let protocol = "https"
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    protocol = "http"
  }
  
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = `${protocol}://${host}/api/${provider}/callback`

  try {
    // 1. Exchange code for Google Tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || tokenData.error) {
      console.error("Google token error:", tokenData)
      return NextResponse.redirect(`${protocol}://${host}/${stateData.o}?error=token_exchange_failed`)
    }

    const expiresAt = Date.now() + (tokenData.expires_in - 60) * 1000

    // 2. Store in Supabase using Service Role Key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // UPSERT token. If it exists for user_id + provider, it will update due to UNIQUE constraint
    const providerName = provider === 'calendar' ? 'google_calendar' : 'google_youtube'
    
    // We attempt an upsert based on the unique user_id, provider constraint
    const { error: dbError } = await supabase.from('user_integrations').upsert({
      user_id: stateData.u,
      provider: providerName,
      access_token: tokenData.access_token,
      // Only overwrite refresh_token if Google actually sent a new one
      ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,provider' 
    })

    if (dbError) {
      console.error("Supabase integration UPSERT error:", dbError)
      return NextResponse.redirect(`${protocol}://${host}${stateData.o}?error=db_error`)
    }

    // 3. Success Redirect
    return NextResponse.redirect(`${protocol}://${host}${stateData.o}?connected=${providerName}`)

  } catch (err) {
    console.error("Callback exception:", err)
    return NextResponse.redirect(`${protocol}://${host}/dashboard?error=server_error`)
  }
}
