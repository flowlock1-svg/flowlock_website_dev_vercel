import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // Determine the base URL (127.0.0.1 for local dev, real domain in production)
  const host = request.headers.get("host") || "127.0.0.1:3000"
  const protocol = host.includes("localhost") || host.startsWith("127.") || host.startsWith("[::1]") 
    ? "http" 
    : "https"
  const baseUrl = `${protocol}://${host}`

  if (error) {
    return NextResponse.redirect(`${baseUrl}/dashboard/playlist?spotify_error=${error}`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/dashboard/playlist?spotify_error=no_code`)
  }

  // The code_verifier is stored in a cookie we set during the login redirect
  const codeVerifier = request.cookies.get("spotify_code_verifier")?.value

  if (!codeVerifier) {
    return NextResponse.redirect(`${baseUrl}/dashboard/playlist?spotify_error=no_verifier`)
  }

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
  const redirectUri = `${baseUrl}/api/spotify/callback`

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Spotify token error:", tokenData)
      return NextResponse.redirect(`${baseUrl}/dashboard/playlist?spotify_error=token_exchange_failed`)
    }

    // Redirect to the playlist page with tokens encoded in the URL hash
    // We use a client-side page to read and store these in localStorage
    const params = new URLSearchParams({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || "",
      expires_in: String(tokenData.expires_in || 3600),
    })

    const response = NextResponse.redirect(`${baseUrl}/dashboard/playlist?${params.toString()}`)

    // Clear the code verifier cookie
    response.cookies.delete("spotify_code_verifier")
    
    return response
  } catch (err) {
    console.error("Spotify callback error:", err)
    return NextResponse.redirect(`${baseUrl}/dashboard/playlist?spotify_error=server_error`)
  }
}
