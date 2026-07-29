import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { SESSION_MARKER_COOKIE } from "./session-marker"

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/",
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // must call getUser() (not getSession()) so the middleware actually
  // revalidates the token with Supabase rather than trusting a stale cookie
  const {
    data: { user: rawUser },
  } = await supabase.auth.getUser()

  // Supabase's auth cookie persists for 400 days regardless of browser
  // restarts, but our own session-only marker cookie doesn't — its absence
  // here means the browser was closed and reopened since the last visit.
  // Treat that the same as an expired session rather than silently trusting
  // the long-lived Supabase cookie.
  const hasBrowserSession = request.cookies.has(SESSION_MARKER_COOKIE)
  let user = rawUser
  if (user && !hasBrowserSession) {
    await supabase.auth.signOut()
    user = null
  }

  const path = request.nextUrl.pathname
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => path === p || (p !== "/" && path.startsWith(p))
  )

  if (!user && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirectTo", path)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && (path === "/login" || path === "/signup")) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
