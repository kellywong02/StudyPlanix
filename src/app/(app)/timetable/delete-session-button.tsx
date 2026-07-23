"use client"

import { useTransition } from "react"

import { deleteClassSession } from "@/lib/actions/class-sessions"
import { Button } from "@/components/ui/button"

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this class session?")) {
          startTransition(() => deleteClassSession(sessionId))
        }
      }}
    >
      ×
    </Button>
  )
}
