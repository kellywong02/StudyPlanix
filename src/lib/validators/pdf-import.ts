import { z } from "zod"

export const pdfSessionSchema = z.object({
  courseCode: z.string().nullable(),
  courseName: z.string(),
  sessionType: z.enum(["lecture", "lab", "tutorial", "seminar", "exam", "other"]),
  location: z.string().nullable(),
  isRecurring: z.boolean(),
  dayOfWeek: z.number().int().min(0).max(6).nullable(),
  startTime: z.string(),
  endTime: z.string(),
  specificDate: z.string().nullable(),
  recurrenceStartDate: z.string().nullable(),
  recurrenceEndDate: z.string().nullable(),
  remarks: z.string().nullable(),
  groupName: z.string().nullable(),
})

export const pdfExtractionSchema = z.object({
  sessions: z.array(pdfSessionSchema).max(150),
})

export type PdfExtraction = z.infer<typeof pdfExtractionSchema>
