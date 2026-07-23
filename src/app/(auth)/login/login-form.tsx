"use client"

import Link from "next/link"
import { useActionState } from "react"

import { login, type AuthActionState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({ confirmEmail }: { confirmEmail: boolean }) {
  const [state, formAction, isPending] = useActionState<
    AuthActionState,
    FormData
  >(login, null)

  return (
    <form action={formAction} className="grid gap-4">
      {confirmEmail && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Check your email to confirm your account before logging in.
        </p>
      )}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
        <Link
          href="/forgot-password"
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          Forgot password?
        </Link>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Logging in..." : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </form>
  )
}
