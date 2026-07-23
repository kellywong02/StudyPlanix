"use client"

import { useTransition } from "react"

import { deleteAssignment } from "@/lib/actions/assignments"
import { Button } from "@/components/ui/button"

export function DeleteAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this assignment?")) {
          startTransition(() => deleteAssignment(assignmentId))
        }
      }}
    >
      Delete
    </Button>
  )
}
