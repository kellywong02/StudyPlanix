import { z } from "zod"

export const ASSIGNMENT_STATUSES = ["not_started", "in_progress", "done"] as const
export const ASSIGNMENT_PRIORITIES = ["low", "medium", "high"] as const

export const assignmentSchema = z.object({
  courseId: z.string().uuid("Choose a course"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(ASSIGNMENT_STATUSES).default("not_started"),
  priority: z.enum(ASSIGNMENT_PRIORITIES).optional(),
})

export type AssignmentInput = z.infer<typeof assignmentSchema>

export const STATUS_LABELS: Record<(typeof ASSIGNMENT_STATUSES)[number], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
}
