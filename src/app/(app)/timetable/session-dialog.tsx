"use client"

import { startTransition, useActionState, useEffect, useRef, useState } from "react"

import { X } from "lucide-react"

import {
  createClassSession,
  updateClassSession,
  type ClassSessionActionState,
} from "@/lib/actions/class-sessions"
import { SESSION_TYPES } from "@/lib/validators/class-sessions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Database } from "@/types/database.types"

type Course = Database["public"]["Tables"]["courses"]["Row"]
type CourseGroupRow = Database["public"]["Tables"]["course_groups"]["Row"]
type CourseWithGroups = Course & { course_groups: CourseGroupRow[] }
type ClassSession = Database["public"]["Tables"]["class_sessions"]["Row"]

export function SessionDialog({
  courses,
  session,
  trigger,
  defaultOpen = false,
}: {
  courses: CourseWithGroups[]
  session?: ClassSession
  trigger: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [dates, setDates] = useState<string[]>(session?.specific_dates ?? [])
  const [dateInput, setDateInput] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState(session?.course_id ?? "")
  const [selectedGroupId, setSelectedGroupId] = useState(session?.group_id ?? "")
  const [title, setTitle] = useState(session?.title ?? "")
  const [sessionType, setSessionType] = useState(session?.session_type ?? "lecture")
  const [location, setLocation] = useState(session?.location ?? "")
  const [startTime, setStartTime] = useState(session?.start_time?.slice(0, 5) ?? "")
  const [endTime, setEndTime] = useState(session?.end_time?.slice(0, 5) ?? "")
  const [remarks, setRemarks] = useState(session?.remarks ?? "")
  const [notes, setNotes] = useState(session?.notes ?? "")

  const groupsForSelectedCourse =
    courses.find((c) => c.id === selectedCourseId)?.course_groups ?? []

  // Server Action form submissions reset uncontrolled fields even when the
  // action returns a validation error, which would silently wipe everything
  // the user typed — keeping every field controlled avoids that
  useEffect(() => {
    if (open) {
      setDates(session?.specific_dates ?? [])
      setDateInput("")
      setSelectedCourseId(session?.course_id ?? "")
      setSelectedGroupId(session?.group_id ?? "")
      setTitle(session?.title ?? "")
      setSessionType(session?.session_type ?? "lecture")
      setLocation(session?.location ?? "")
      setStartTime(session?.start_time?.slice(0, 5) ?? "")
      setEndTime(session?.end_time?.slice(0, 5) ?? "")
      setRemarks(session?.remarks ?? "")
      setNotes(session?.notes ?? "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session])

  function addDate() {
    if (dateInput && !dates.includes(dateInput)) {
      setDates((prev) => [...prev, dateInput].sort())
    }
    setDateInput("")
  }

  const action = session
    ? updateClassSession.bind(null, session.id)
    : createClassSession
  const [state, formAction, isPending] = useActionState<
    ClassSessionActionState,
    FormData
  >(action, null)

  const wasPending = useRef(false)
  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setOpen(false)
    }
    wasPending.current = isPending
  }, [isPending, state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{session ? "Edit class session" : "New class session"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            startTransition(() => formAction(formData))
          }}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="courseId">Course</Label>
            <Select
              name="courseId"
              value={selectedCourseId}
              onValueChange={(value) => {
                setSelectedCourseId(value)
                setSelectedGroupId("")
              }}
              required
            >
              <SelectTrigger id="courseId">
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.code ? ` (${c.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {groupsForSelectedCourse.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="groupId">Group (optional)</Label>
              <Select
                name="groupId"
                value={selectedGroupId}
                onValueChange={setSelectedGroupId}
              >
                <SelectTrigger id="groupId">
                  <SelectValue placeholder="No specific group" />
                </SelectTrigger>
                <SelectContent>
                  {groupsForSelectedCourse.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                      {g.instructor ? ` — ${g.instructor}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midterm Exam"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sessionType">Type</Label>
              <Select name="sessionType" value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger id="sessionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t[0].toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endTime">End time</Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dateInput">Dates</Label>
            {dates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {dates.map((d) => (
                  <Badge key={d} variant="secondary" className="gap-1 pr-1">
                    {d}
                    <button
                      type="button"
                      aria-label={`Remove ${d}`}
                      onClick={() => setDates((prev) => prev.filter((x) => x !== d))}
                      className="rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                id="dateInput"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={addDate}>
                Add
              </Button>
            </div>
            {dates.map((d) => (
              <input key={d} type="hidden" name="specificDates" value={d} />
            ))}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Textarea
              id="remarks"
              name="remarks"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Bring calculator, room changed this week"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your own notes about this class"
            />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : session ? "Save changes" : "Add session"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
