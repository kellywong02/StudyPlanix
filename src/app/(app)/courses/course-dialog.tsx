"use client"

import { useActionState, useEffect, useRef, useState } from "react"

import { X } from "lucide-react"

import { createCourse, updateCourse, type CourseActionState } from "@/lib/actions/courses"
import { COURSE_COLORS, type CourseGroupInput } from "@/lib/validators/courses"
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
import type { Database } from "@/types/database.types"

type Course = Database["public"]["Tables"]["courses"]["Row"]
type CourseGroupRow = Database["public"]["Tables"]["course_groups"]["Row"]
export type CourseWithGroups = Course & { course_groups: CourseGroupRow[] }

export function CourseDialog({
  course,
  trigger,
  gradeOptions,
}: {
  course?: CourseWithGroups
  trigger: React.ReactNode
  gradeOptions: string[]
}) {
  const [open, setOpen] = useState(false)
  const action = course ? updateCourse.bind(null, course.id) : createCourse
  const [state, formAction, isPending] = useActionState<
    CourseActionState,
    FormData
  >(action, null)

  const wasPending = useRef(false)
  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setOpen(false)
    }
    wasPending.current = isPending
  }, [isPending, state])

  const initialGroups =
    course?.course_groups.map((g) => ({
      name: g.name,
      instructor: g.instructor ?? "",
      instructorEmail: g.instructor_email ?? "",
    })) ?? []
  const [groups, setGroups] = useState<CourseGroupInput[]>(initialGroups)
  const [groupNameInput, setGroupNameInput] = useState("")
  const [groupInstructorInput, setGroupInstructorInput] = useState("")
  const [groupInstructorEmailInput, setGroupInstructorEmailInput] = useState("")
  const [groupError, setGroupError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setGroups(initialGroups)
      setGroupNameInput("")
      setGroupInstructorInput("")
      setGroupInstructorEmailInput("")
      setGroupError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, course])

  function addGroup() {
    const name = groupNameInput.trim()
    if (!name) return
    const email = groupInstructorEmailInput.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setGroupError("Enter a valid instructor email")
      return
    }
    setGroupError(null)
    setGroups((prev) => [
      ...prev,
      {
        name,
        instructor: groupInstructorInput.trim() || undefined,
        instructorEmail: email || undefined,
      },
    ])
    setGroupNameInput("")
    setGroupInstructorInput("")
    setGroupInstructorEmailInput("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{course ? "Edit course" : "New course"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Course name</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={course?.name}
              placeholder="Intro to Algorithms"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Course code</Label>
              <Input id="code" name="code" defaultValue={course?.code ?? ""} placeholder="CS101" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="term">Term</Label>
              <Input id="term" name="term" defaultValue={course?.term ?? ""} placeholder="Fall 2026" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Default location</Label>
            <Input id="location" name="location" defaultValue={course?.location ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                name="credits"
                type="number"
                step="0.5"
                min="0"
                defaultValue={course?.credits ?? ""}
                placeholder="e.g. 4"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grade">Final grade</Label>
              <Select name="grade" defaultValue={course?.grade ?? "none"}>
                <SelectTrigger id="grade" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not graded yet</SelectItem>
                  {gradeOptions.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="groupNameInput">Groups</Label>
            {groups.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {groups.map((g, i) => (
                  <Badge key={`${g.name}-${i}`} variant="secondary" className="gap-1 pr-1">
                    {g.name}
                    {g.instructor ? ` — ${g.instructor}` : ""}
                    <button
                      type="button"
                      aria-label={`Remove ${g.name}`}
                      onClick={() => setGroups((prev) => prev.filter((_, idx) => idx !== i))}
                      className="rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="groupNameInput"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addGroup()
                  }
                }}
                placeholder="Group name, e.g. Tutorial 3"
              />
              <Input
                value={groupInstructorInput}
                onChange={(e) => setGroupInstructorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addGroup()
                  }
                }}
                placeholder="Instructor (optional)"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                value={groupInstructorEmailInput}
                onChange={(e) => setGroupInstructorEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addGroup()
                  }
                }}
                placeholder="Instructor email (optional)"
              />
              <Button type="button" variant="outline" onClick={addGroup}>
                Add
              </Button>
            </div>
            {groupError && <p className="text-sm text-destructive">{groupError}</p>}
            <input type="hidden" name="groupsJson" value={JSON.stringify(groups)} />
          </div>
          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COURSE_COLORS.map((c) => (
                <label key={c.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={c.value}
                    defaultChecked={
                      course ? course.color === c.value : c.value === COURSE_COLORS[0].value
                    }
                    className="peer sr-only"
                  />
                  <span
                    className="block size-6 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-ring"
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                </label>
              ))}
            </div>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : course ? "Save changes" : "Create course"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
