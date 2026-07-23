import { z } from "zod"

export const STUDY_TYPES = [
  "full_time",
  "part_time",
  "part_time_job",
  "full_time_job",
] as const

export const STUDY_TYPE_LABELS: Record<(typeof STUDY_TYPES)[number], string> = {
  full_time: "Full-time student",
  part_time: "Part-time student",
  part_time_job: "Part-time student with a full-time job",
  full_time_job: "Full-time student with a full-time job",
}

export const studyPreferencesSchema = z.object({
  studyType: z.enum(STUDY_TYPES),
  studyAvailability: z.string().max(1000).optional(),
})

export type StudyPreferencesInput = z.infer<typeof studyPreferencesSchema>

export const studyPlanSessionSchema = z.object({
  assignmentId: z.string().uuid().nullable(),
  courseId: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM"),
  notes: z.string().max(300).nullable(),
})

export const aiStudyPlanSchema = z.object({
  sessions: z.array(studyPlanSessionSchema).max(60),
})

export type AiStudyPlan = z.infer<typeof aiStudyPlanSchema>
