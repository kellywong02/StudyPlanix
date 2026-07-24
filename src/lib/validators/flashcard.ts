import { z } from "zod"

export const flashcardSchema = z.object({
  front: z.string(),
  back: z.string(),
})

export const flashcardGenerationSchema = z.object({
  title: z.string(),
  cards: z.array(flashcardSchema).max(40),
})

export type FlashcardGeneration = z.infer<typeof flashcardGenerationSchema>
