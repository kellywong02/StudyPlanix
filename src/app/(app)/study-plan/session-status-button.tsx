"use client"

import { useTransition } from "react"

import { deleteStudyPlanSession, updateStudyPlanSessionStatus } from "@/lib/actions/study-plan"
import { Button } from "@/components/ui/button"

function DeleteButton({ sessionId, isPending, startTransition }: {
  sessionId: string
  isPending: boolean
  startTransition: (fn: () => void | Promise<void>) => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this study session?")) {
          startTransition(() => deleteStudyPlanSession(sessionId))
        }
      }}
    >
      Delete
    </Button>
  )
}

export function SessionStatusButton({
  sessionId,
  status,
}: {
  sessionId: string
  status: string
}) {
  const [isPending, startTransition] = useTransition()

  if (status === "done") {
    return (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => updateStudyPlanSessionStatus(sessionId, "planned"))}
        >
          Done ✓
        </Button>
        <DeleteButton sessionId={sessionId} isPending={isPending} startTransition={startTransition} />
      </div>
    )
  }

  return (
    <div className="flex gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => updateStudyPlanSessionStatus(sessionId, "done"))}
      >
        Mark done
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => updateStudyPlanSessionStatus(sessionId, "skipped"))}
      >
        Skip
      </Button>
      <DeleteButton sessionId={sessionId} isPending={isPending} startTransition={startTransition} />
    </div>
  )
}
