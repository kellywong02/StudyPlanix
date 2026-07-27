import "server-only"
import { zodResponseFormat } from "openai/helpers/zod"

import { getOpenAIClient } from "@/lib/ai/openai"
import { flashcardGenerationSchema, type FlashcardGeneration } from "@/lib/validators/flashcard"

// Course material (syllabus, lecture notes, slides) can run long; cap what we
// send so a dense document doesn't blow past context/cost budgets.
const MAX_INPUT_CHARS = 15000

const SYSTEM_PROMPT = `You write flashcards from course material (a syllabus, lecture notes, slides, \
or textbook excerpt) pulled from a PDF. The text may be messy (extracted from a table or multi-column layout).

Write exactly the requested number of flashcards testing the substantive content (key terms, definitions, \
concepts, facts, relationships) — not the document's formatting or metadata like page numbers.

Each card has a short "front" (a term or question) and a concise "back" (the definition or answer — a \
phrase or short sentence, not a paragraph).

Give the deck a short descriptive title based on the material's subject matter.

If the text doesn't contain enough substantive content for the requested count, return as many reasonable \
cards as you can rather than failing.`

export async function generateFlashcards(
  sourceText: string,
  cardCount: number
): Promise<FlashcardGeneration> {
  const client = getOpenAIClient()

  const completion = await client.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Write ${cardCount} flashcards from this material:\n\n${sourceText.slice(0, MAX_INPUT_CHARS)}`,
      },
    ],
    response_format: zodResponseFormat(flashcardGenerationSchema, "flashcard_generation"),
  })

  const parsed = completion.choices[0]?.message.parsed
  if (!parsed || parsed.cards.length === 0) {
    throw new Error("The AI could not generate flashcards from this PDF. Try a different file.")
  }

  // The model doesn't always follow "exactly N" precisely — clamp to the
  // requested count so the deck never exceeds what the user selected.
  return { ...parsed, cards: parsed.cards.slice(0, cardCount) }
}
