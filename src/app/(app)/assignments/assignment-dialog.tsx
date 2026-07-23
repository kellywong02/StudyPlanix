"use client"

import { startTransition, useActionState, useEffect, useRef, useState } from "react"

import {
  createAssignment,
  updateAssignment,
  type AssignmentActionState,
} from "@/lib/actions/assignments"
import {
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_STATUSES,
  STATUS_LABELS,
} from "@/lib/validators/assignments"
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
import type { Database } from "@/types/database.types"

type Course = Database["public"]["Tables"]["courses"]["Row"]
type Assignment = Database["public"]["Tables"]["assignments"]["Row"]

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

export function AssignmentDialog({
  courses,
  assignment,
  trigger,
  defaultOpen = false,
  defaultCourseId,
}: {
  courses: Course[]
  assignment?: Assignment
  trigger: React.ReactNode
  defaultOpen?: boolean
  defaultCourseId?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [title, setTitle] = useState(assignment?.title ?? "")
  const [courseId, setCourseId] = useState(assignment?.course_id ?? defaultCourseId ?? "")
  const [description, setDescription] = useState(assignment?.description ?? "")
  const [dueDate, setDueDate] = useState(assignment ? toDatetimeLocal(assignment.due_date) : "")
  const [priority, setPriority] = useState(assignment?.priority ?? "")
  const [status, setStatus] = useState(assignment?.status ?? "not_started")

  const action = assignment
    ? updateAssignment.bind(null, assignment.id)
    : createAssignment
  const [state, formAction, isPending] = useActionState<
    AssignmentActionState,
    FormData
  >(action, null)

  const wasPending = useRef(false)
  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setOpen(false)
    }
    wasPending.current = isPending
  }, [isPending, state])

  useEffect(() => {
    if (open) {
      setTitle(assignment?.title ?? "")
      setCourseId(assignment?.course_id ?? defaultCourseId ?? "")
      setDescription(assignment?.description ?? "")
      setDueDate(assignment ? toDatetimeLocal(assignment.due_date) : "")
      setPriority(assignment?.priority ?? "")
      setStatus(assignment?.status ?? "not_started")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assignment, defaultCourseId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{assignment ? "Edit assignment" : "New assignment"}</DialogTitle>
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
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="courseId">Course</Label>
            <Select name="courseId" value={courseId} onValueChange={setCourseId} required>
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

          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : assignment ? "Save changes" : "Add assignment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
