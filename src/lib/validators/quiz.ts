import { z } from "zod"

export const QUESTION_TYPES = ["mcq", "true_false", "short_answer"] as const

export const quizQuestionSchema = z.object({
  questionType: z.enum(QUESTION_TYPES),
  questionText: z.string(),
  options: z.array(z.string()).nullable(),
  correctAnswer: z.string(),
  explanation: z.string().nullable(),
})

export const quizGenerationSchema = z.object({
  title: z.string(),
  questions: z.array(quizQuestionSchema).max(30),
})

export type QuizGeneration = z.infer<typeof quizGenerationSchema>

export const shortAnswerGradeSchema = z.object({
  results: z.array(
    z.object({
      questionId: z.string(),
      isCorrect: z.boolean(),
      feedback: z.string(),
    })
  ),
})

export type ShortAnswerGrade = z.infer<typeof shortAnswerGradeSchema>
