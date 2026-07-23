"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function SessionInfoDialog({
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  title,
  courseName,
  dateLabel,
  timeLabel,
  location,
  groupName,
  remarks,
  notes,
  previousLessonNotes,
  lessonNumber,
  courseId,
  sessionId,
}: {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  courseName?: string | null
  dateLabel: string
  timeLabel: string
  location?: string | null
  groupName?: string | null
  remarks?: string | null
  notes?: string | null
  previousLessonNotes?: string | null
  lessonNumber?: number
  courseId: string
  sessionId: string
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChangeProp ?? setInternalOpen

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <span className="contents cursor-pointer" onClick={() => setOpen(true)}>
          {trigger}
        </span>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title}
            {lessonNumber && (
              <span className="ml-1.5 font-normal text-muted-foreground">
                · Lesson {lessonNumber}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 text-sm">
          {courseName && (
            <p>
              <span className="text-muted-foreground">Course: </span>
              {courseName}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">When: </span>
            {dateLabel} · {timeLabel}
          </p>
          {location && (
            <p>
              <span className="text-muted-foreground">Location: </span>
              {location}
            </p>
          )}
          {groupName && (
            <p>
              <span className="text-muted-foreground">Group: </span>
              {groupName}
            </p>
          )}
          {remarks && <p className="text-muted-foreground italic">{remarks}</p>}
          {notes && (
            <p>
              <span className="text-muted-foreground">Notes: </span>
              {notes}
            </p>
          )}
          {previousLessonNotes && (
            <p className="rounded bg-muted p-1.5">📌 From last lesson: {previousLessonNotes}</p>
          )}
        </div>
        <Button asChild className="mt-2 w-fit">
          <Link href={`/timetable?course=${courseId}&edit=${sessionId}`}>Edit</Link>
        </Button>
      </DialogContent>
    </Dialog>
  )
}
