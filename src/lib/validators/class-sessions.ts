import { z } from "zod"

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export const SESSION_TYPES = [
  "lecture",
  "lab",
  "tutorial",
  "seminar",
  "exam",
  "other",
] as const

// Used for the "· Lecture 1", "· Lab 2" etc. numbering shown on timetable,
// dashboard, and calendar session cards — "other" falls back to the
// generic "Lesson" since it has no more specific name.
export const SESSION_TYPE_LABELS: Record<(typeof SESSION_TYPES)[number], string> = {
  lecture: "Lecture",
  lab: "Lab",
  tutorial: "Tutorial",
  seminar: "Seminar",
  exam: "Exam",
  other: "Lesson",
}

export function sessionTypeLabel(type: string | null | undefined): string {
  return SESSION_TYPE_LABELS[type as keyof typeof SESSION_TYPE_LABELS] ?? "Lesson"
}

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const

export const classSessionSchema = z
  .object({
    courseId: z.string().uuid("Choose a course"),
    groupId: z.string().uuid().optional(),
    title: z.string().optional(),
    sessionType: z.enum(SESSION_TYPES).default("lecture"),
    location: z.string().optional(),
    startTime: z.string().regex(TIME_RE, "Enter a valid time"),
    endTime: z.string().regex(TIME_RE, "Enter a valid time"),
    specificDates: z.array(z.string()).min(1, "At least one date is required"),
    remarks: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endTime <= data.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after start time",
      })
    }
  })

export type ClassSessionInput = z.infer<typeof classSessionSchema>
