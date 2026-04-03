import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isLoginPage = pathname === '/login' || pathname === '/'
  const isDashboard = pathname.startsWith('/dashboard')

  // Detect Supabase session by looking for ANY cookie that starts with 'sb-'
  // This works regardless of project ref or chunking format
  const allCookies = req.cookies.getAll()
  
  console.log('[MIDDLEWARE] Cookies found:', allCookies.map(c => c.name))
  
  const hasSession = allCookies.some(
    (cookie) =>
      cookie.name.startsWith('sb-') &&
      cookie.name.includes('-auth-token') &&
      cookie.value.length > 0
  )

  console.log('[MIDDLEWARE] hasSession:', hasSession)

  // Already logged in and hitting login page → go to dashboard
  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Not logged in and hitting protected page → go to login
  if (!hasSession && isDashboard) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*']
}
