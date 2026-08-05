"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { deleteClassSessions } from "@/lib/actions/class-sessions"
import { sessionTypeLabel } from "@/lib/validators/class-sessions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Database } from "@/types/database.types"

import { SessionDialog } from "./session-dialog"
import { DeleteSessionButton } from "./delete-session-button"
import { SessionNotesEditor } from "./session-notes-editor"

type Course = Database["public"]["Tables"]["courses"]["Row"]
type CourseGroupRow = Database["public"]["Tables"]["course_groups"]["Row"]
type CourseWithGroups = Course & { course_groups: CourseGroupRow[] }
type ClassSession = Database["public"]["Tables"]["class_sessions"]["Row"] & {
  courses: Pick<Course, "name" | "color" | "code"> | null
  course_groups: Pick<CourseGroupRow, "name"> | null
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDateWithDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dayName = DAY_NAMES[new Date(y, m - 1, d).getDay()]
  return `${dateStr} (${dayName})`
}

function formatTime(time: string) {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${m} ${period}`
}

export function ClassSessionList({
  heading,
  sessions,
  courses,
  previousLessonNotes,
  lessonNumbers,
  autoOpenSessionId,
}: {
  heading: string
  sessions: ClassSession[]
  courses: CourseWithGroups[]
  previousLessonNotes?: Record<string, string>
  lessonNumbers?: Record<string, number>
  autoOpenSessionId?: string
}) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const allSelected = sessions.length > 0 && selected.size === sessions.length

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(sessions.map((s) => s.id)))
  }

  function handleDelete() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} selected class session(s)?`)) return
    startTransition(async () => {
      await deleteClassSessions([...selected])
      setSelected(new Set())
      setSelectionMode(false)
    })
  }

  if (sessions.length === 0) return null

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{heading}</h2>
        <div className="flex gap-2">
          {selectionMode ? (
            <>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={selected.size === 0 || isPending}
                onClick={handleDelete}
              >
                {isPending ? "Deleting..." : `Delete (${selected.size})`}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectionMode(false)
                  setSelected(new Set())
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>
              Select
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            courses={courses}
            previousLessonNotes={previousLessonNotes?.[s.id]}
            lessonNumber={lessonNumbers?.[s.id]}
            selectionMode={selectionMode}
            selected={selected.has(s.id)}
            onToggleSelect={() => toggle(s.id)}
            autoOpen={s.id === autoOpenSessionId}
          />
        ))}
      </div>
    </div>
  )
}

function SessionCard({
  session: s,
  courses,
  previousLessonNotes,
  lessonNumber,
  selectionMode,
  selected,
  onToggleSelect,
  autoOpen,
}: {
  session: ClassSession
  courses: CourseWithGroups[]
  previousLessonNotes?: string
  lessonNumber?: number
  selectionMode: boolean
  selected: boolean
  onToggleSelect: () => void
  autoOpen?: boolean
}) {
  return (
    <Card>
      <CardContent className="grid gap-1">
        <div className="flex items-start justify-between gap-1">
          <span className="text-sm font-medium">
            {s.title || s.courses?.name}
            {lessonNumber && (
              <span className="ml-1.5 font-normal text-muted-foreground">
                · {sessionTypeLabel(s.session_type)} {lessonNumber}
              </span>
            )}
          </span>
          {selectionMode ? (
            <input
              type="checkbox"
              className="size-4 shrink-0"
              checked={selected}
              onChange={onToggleSelect}
              aria-label={`Select ${s.title || s.courses?.name}`}
            />
          ) : (
            <DeleteSessionButton sessionId={s.id} />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {s.specific_dates?.map(formatDateWithDay).join(", ")}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTime(s.start_time)} – {formatTime(s.end_time)}
        </p>
        {s.course_groups?.name && (
          <p className="text-xs text-muted-foreground">Group: {s.course_groups.name}</p>
        )}
        {s.remarks && <p className="text-xs text-muted-foreground italic">{s.remarks}</p>}
        {previousLessonNotes && (
          <p className="rounded bg-muted p-1.5 text-xs">
            📌 From last lesson: {previousLessonNotes}
          </p>
        )}
        <SessionNotesEditor sessionId={s.id} initialNotes={s.notes ?? ""} />
        <div className="mt-1 flex gap-2">
          <SessionDialog
            courses={courses}
            session={s}
            defaultOpen={autoOpen}
            trigger={
              <Button variant="outline" size="xs" className="w-fit">
                Edit
              </Button>
            }
          />
          <Button asChild variant="outline" size="xs" className="w-fit">
            <Link href={`/assignments?course=${s.course_id}&new=1`}>+ Assignment</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
