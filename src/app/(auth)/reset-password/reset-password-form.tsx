"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { startTransition, useActionState, useEffect, useState } from "react"

import { resetPassword, type ResetPasswordActionState } from "@/lib/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ResetPasswordForm() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [linkStatus, setLinkStatus] = useState<"checking" | "ready" | "invalid">("checking")
  const [state, formAction, isPending] = useActionState<
    ResetPasswordActionState,
    FormData
  >(resetPassword, null)

  useEffect(() => {
    // recovery links deliver tokens in the URL hash fragment (implicit flow —
    // PKCE isn't possible here since the link is opened from an email client,
    // not the browser that requested it). @supabase/ssr's browser client is
    // hardcoded to flowType "pkce", so its automatic URL-detection only looks
    // for a `?code=` query param and ignores the hash entirely — it has to be
    // parsed and applied manually via setSession.
    const supabase = createClient()

    async function establishSession() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        window.history.replaceState(null, "", window.location.pathname)
        if (!error) {
          setLinkStatus("ready")
          return
        }
      } else {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setLinkStatus("ready")
          return
        }
      }
      setLinkStatus("invalid")
    }

    establishSession()
  }, [])

  useEffect(() => {
    if (state?.success) {
      const timeout = setTimeout(() => router.push("/dashboard"), 1500)
      return () => clearTimeout(timeout)
    }
  }, [state, router])

  if (state?.success) {
    return (
      <p className="text-sm text-emerald-600 dark:text-emerald-400">
        Password updated. Taking you to your dashboard...
      </p>
    )
  }

  if (linkStatus === "checking") {
    return <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
  }

  if (linkStatus === "invalid") {
    return (
      <p className="text-sm text-destructive">
        This reset link is invalid or has expired.{" "}
        <Link href="/forgot-password" className="underline underline-offset-4">
          Request a new one
        </Link>
        .
      </p>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        startTransition(() => formAction(formData))
      }}
      className="grid gap-4"
    >
      <div className="grid gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      {state?.error && (
        <div className="text-sm text-destructive">
          {state.error}
          {state.error.includes("expired") && (
            <>
              {" "}
              <Link href="/forgot-password" className="underline underline-offset-4">
                Request a new link
              </Link>
            </>
          )}
        </div>
      )}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving..." : "Set new password"}
      </Button>
    </form>
  )
}
