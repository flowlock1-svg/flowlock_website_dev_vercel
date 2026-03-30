import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  const { provider } = await params
  
  // Validation
  if (provider !== 'calendar' && provider !== 'youtube') {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  // Get user_id from query (sent by frontend)
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  
  if (!userId) {
    return NextResponse.redirect(`${request.nextUrl.origin}/dashboard?error=missing_user_id`)
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
  // Determine correct protocol depending on if we're on localhost
  const host = request.headers.get("host") || "127.0.0.1:3000"
  let protocol = "https"
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    protocol = "http"
  }
  
  const redirectUri = `${protocol}://${host}/api/${provider}/callback`

  let scopes = ""
  let originPage = ""
  if (provider === 'calendar') {
    scopes = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events email profile"
    originPage = "/dashboard/calendar"
  } else {
    scopes = "https://www.googleapis.com/auth/youtube.readonly email profile"
    originPage = "/dashboard/playlist"
  }

  // Include user_id in state so we can receive it in the callback
  const stateData = { o: originPage, u: userId, p: provider }
  const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64')
  
  const oauthParams = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state: encodedState,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${oauthParams.toString()}`)
}
