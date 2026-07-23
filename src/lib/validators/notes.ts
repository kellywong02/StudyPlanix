import { z } from "zod"

export const noteSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  courseId: z.string().uuid().nullable(),
  content: z.unknown(),
})

export type NoteInput = z.infer<typeof noteSchema>
