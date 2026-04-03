import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Try several common Supabase cookie names
  const token = req.cookies.get('sb-access-token')?.value ?? 
                req.cookies.get('supabase-auth-token')?.value ??
                req.cookies.get('sb-cutgjwfkgkoynmxpsntr-auth-token')?.value

  const isLoginPage = req.nextUrl.pathname === '/login' || 
                      req.nextUrl.pathname === '/'

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*']
}
