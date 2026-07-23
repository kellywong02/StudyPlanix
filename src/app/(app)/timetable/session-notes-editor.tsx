"use client"

import { useState, useTransition } from "react"

import { updateSessionNotes } from "@/lib/actions/class-sessions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function SessionNotesEditor({
  sessionId,
  initialNotes,
}: {
  sessionId: string
  initialNotes: string
}) {
  const [notes, setNotes] = useState(initialNotes)
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await updateSessionNotes(sessionId, notes)
      setIsEditing(false)
    })
  }

  if (!isEditing) {
    return notes ? (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-left text-xs text-muted-foreground hover:underline"
      >
        Notes: {notes}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="w-fit text-xs text-muted-foreground underline underline-offset-4"
      >
        + Add note for next lesson
      </button>
    )
  }

  return (
    <div className="grid gap-1.5">
      <Textarea
        rows={2}
        autoFocus
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. Bring lab report draft next class"
        className="text-xs"
      />
      <div className="flex gap-2">
        <Button type="button" size="xs" disabled={isPending} onClick={save}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setNotes(initialNotes)
            setIsEditing(false)
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
