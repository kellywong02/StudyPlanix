"use client"

import Link from "next/link"
import { startTransition, useActionState, useState } from "react"

import { requestPasswordReset, type ForgotPasswordActionState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [state, formAction, isPending] = useActionState<
    ForgotPasswordActionState,
    FormData
  >(requestPasswordReset, null)

  if (state?.success) {
    return (
      <p className="text-sm text-muted-foreground">
        If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent
        a password reset link to it. Check your inbox.
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Sending..." : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4">
          Back to log in
        </Link>
      </p>
    </form>
  )
}
