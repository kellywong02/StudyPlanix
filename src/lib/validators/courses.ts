import { z } from "zod"

export const courseGroupSchema = z.object({
  name: z.string().min(1),
  instructor: z.string().optional(),
  instructorEmail: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Enter a valid email"),
})

export const courseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  code: z.string().optional(),
  color: z.string().optional(),
  location: z.string().optional(),
  term: z.string().optional(),
  credits: z.coerce.number().positive().optional(),
  grade: z.string().optional(),
  groups: z.array(courseGroupSchema).optional(),
})

export type CourseInput = z.infer<typeof courseSchema>
export type CourseGroupInput = z.infer<typeof courseGroupSchema>

export const COURSE_COLORS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Teal", value: "#14b8a6" },
] as const
