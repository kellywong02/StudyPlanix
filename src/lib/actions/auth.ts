"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { SESSION_MARKER_COOKIE, SESSION_MARKER_COOKIE_OPTIONS } from "@/lib/supabase/session-marker"
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validators/auth"

async function markBrowserSession() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_MARKER_COOKIE, "1", SESSION_MARKER_COOKIE_OPTIONS)
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export type AuthActionState = {
  error?: string
} | null

export async function login(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { error: error.message }
  }

  await markBrowserSession()
  redirect("/dashboard")
}

export async function signup(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // if email confirmations are disabled, signUp() already returns an active
  // session — go straight to the dashboard instead of telling them to check email
  if (data.session) {
    await markBrowserSession()
    redirect("/dashboard")
  }

  redirect("/login?confirmEmail=1")
}

export type ChangePasswordActionState = {
  error?: string
  success?: boolean
} | null

export async function changePassword(
  _prevState: ChangePasswordActionState,
  formData: FormData
): Promise<ChangePasswordActionState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return { error: "Not authenticated" }
  }

  // re-verify the current password before allowing the change, rather than
  // trusting the existing session alone
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  })
  if (reauthError) {
    return { error: "Current password is incorrect" }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })
  if (updateError) {
    return { error: updateError.message }
  }

  return { success: true }
}

export type ForgotPasswordActionState = {
  error?: string
  success?: boolean
} | null

export async function requestPasswordReset(
  _prevState: ForgotPasswordActionState,
  formData: FormData
): Promise<ForgotPasswordActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  // recovery links use implicit-flow tokens delivered in the URL hash
  // fragment, not a `code` query param — that's invisible to the server, so
  // this goes straight to /reset-password instead of through /auth/callback,
  // and the browser client parses the session client-side
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/reset-password`,
  })

  // always report success regardless of whether the email is registered, so
  // this can't be used to probe which addresses have an account
  return { success: true }
}

export type ResetPasswordActionState = {
  error?: string
  success?: boolean
} | null

export async function resetPassword(
  _prevState: ResetPasswordActionState,
  formData: FormData
): Promise<ResetPasswordActionState> {
  const parsed = resetPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "This reset link is invalid or has expired. Request a new one." }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })
  if (error) {
    return { error: error.message }
  }

  await markBrowserSession()
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_MARKER_COOKIE)
  redirect("/login")
}
