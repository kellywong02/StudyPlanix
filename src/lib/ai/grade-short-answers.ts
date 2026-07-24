import "server-only"
import { zodResponseFormat } from "openai/helpers/zod"

import { getOpenAIClient } from "@/lib/ai/openai"
import { shortAnswerGradeSchema } from "@/lib/validators/quiz"

export type ShortAnswerItem = {
  questionId: string
  questionText: string
  correctAnswer: string
  studentAnswer: string
}

const SYSTEM_PROMPT = `You grade short-answer quiz responses. For each item, decide whether the student's \
answer is substantively correct compared to the model answer — accept paraphrases, synonyms, and minor \
wording differences, but mark it incorrect if it misses the key point or is factually wrong. Give brief, \
encouraging feedback (one sentence).`

export async function gradeShortAnswers(
  items: ShortAnswerItem[]
): Promise<Map<string, { isCorrect: boolean; feedback: string }>> {
  if (items.length === 0) return new Map()

  const client = getOpenAIClient()

  const userMessage = items
    .map(
      (i) =>
        `questionId=${i.questionId}\nQuestion: ${i.questionText}\nModel answer: ${i.correctAnswer}\nStudent answer: ${i.studentAnswer || "(blank)"}`
    )
    .join("\n\n")

  const completion = await client.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: zodResponseFormat(shortAnswerGradeSchema, "short_answer_grade"),
  })

  const parsed = completion.choices[0]?.message.parsed
  const results = new Map<string, { isCorrect: boolean; feedback: string }>()
  if (!parsed) {
    for (const i of items) {
      results.set(i.questionId, { isCorrect: false, feedback: "Could not be auto-graded." })
    }
    return results
  }

  for (const r of parsed.results) {
    results.set(r.questionId, { isCorrect: r.isCorrect, feedback: r.feedback })
  }
  return results
}
