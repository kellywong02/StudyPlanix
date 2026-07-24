import "server-only"
import { zodResponseFormat } from "openai/helpers/zod"

import { getOpenAIClient } from "@/lib/ai/openai"
import { quizGenerationSchema, type QuizGeneration } from "@/lib/validators/quiz"

// Course material (syllabus, lecture notes, slides) can run long; cap what we
// send so a dense document doesn't blow past context/cost budgets.
const MAX_INPUT_CHARS = 15000

const SYSTEM_PROMPT = `You write a study quiz from course material (a syllabus, lecture notes, slides, \
or textbook excerpt) pulled from a PDF. The text may be messy (extracted from a table or multi-column layout).

Write exactly the requested number of questions that test understanding of the substantive content \
(concepts, definitions, facts, relationships) — not the document's formatting or metadata like page numbers.

Use a mix of question types:
- "mcq": a question with exactly 4 plausible options in the options array; correctAnswer must exactly match \
one of the options.
- "true_false": options must be exactly ["True", "False"]; correctAnswer is "True" or "False".
- "short_answer": options must be null; correctAnswer is a concise model answer (a phrase or sentence).

Always include a brief explanation for why the answer is correct.

Give the quiz a short descriptive title based on the material's subject matter.

If the text doesn't contain enough substantive content to write questions from, return as many \
reasonable questions as you can rather than failing.`

export async function generateQuiz(
  sourceText: string,
  questionCount: number
): Promise<QuizGeneration> {
  const client = getOpenAIClient()

  const completion = await client.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Write ${questionCount} questions from this material:\n\n${sourceText.slice(0, MAX_INPUT_CHARS)}`,
      },
    ],
    response_format: zodResponseFormat(quizGenerationSchema, "quiz_generation"),
  })

  const parsed = completion.choices[0]?.message.parsed
  if (!parsed || parsed.questions.length === 0) {
    throw new Error("The AI could not generate a quiz from this PDF. Try a different file.")
  }

  return parsed
}
