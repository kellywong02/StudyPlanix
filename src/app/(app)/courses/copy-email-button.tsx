"use client"

import { Mail } from "lucide-react"
import { toast } from "sonner"

export function CopyEmailButton({ email, label }: { email: string; label: string }) {
  async function handleClick() {
    try {
      await navigator.clipboard.writeText(email)
      toast.success(`Copied ${email}`)
    } catch {
      toast.error("Couldn't copy email")
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={email}
      aria-label={`Copy email for ${label}`}
      className="text-primary hover:text-primary/70"
    >
      <Mail className="size-3" />
    </button>
  )
}
