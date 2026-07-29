import "server-only"

// Supabase's own auth cookies always persist for 400 days (hardcoded in
// @supabase/ssr's cookie storage adapter — the maxAge you pass via
// `cookieOptions` gets silently overwritten back to the default), so a
// signed-in user stays logged in across browser restarts unless tracked
// separately. This marker cookie has no maxAge/expires, making it a true
// browser-session cookie: it survives reloads and new tabs within the same
// browser session, but disappears when the browser itself is fully closed.
//
// It must be set explicitly at every place a session gets established
// (login, signup, the OAuth/email callback route, password reset) rather
// than inferred lazily in middleware — right after a fresh login the marker
// legitimately hasn't been set yet, which looks identical to "browser was
// restarted with a stale cookie" if middleware tried to guess.
export const SESSION_MARKER_COOKIE = "sp-browser-session"

export const SESSION_MARKER_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
}
