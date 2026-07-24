import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { extractPdfText, PdfExtractionError } from "@/lib/import/extract-pdf-text"
import { generateFlashcards } from "@/lib/ai/generate-flashcards"

const CARD_COUNT_OPTIONS = [10, 20, 30, 40]
const DEFAULT_CARD_COUNT = 20

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Flashcard generation is not configured. Set OPENAI_API_KEY." },
      { status: 500 }
    )
  }

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
  }

  const courseId = formData.get("courseId")
  const requestedCount = Number(formData.get("cardCount"))
  const cardCount = CARD_COUNT_OPTIONS.includes(requestedCount) ? requestedCount : DEFAULT_CARD_COUNT

  let text: string
  try {
    text = await extractPdfText(file)
  } catch (err) {
    if (err instanceof PdfExtractionError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }

  let generated
  try {
    generated = await generateFlashcards(text, cardCount)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate flashcards" },
      { status: 500 }
    )
  }

  const { data: deck, error: deckError } = await supabase
    .from("flashcard_decks")
    .insert({
      user_id: user.id,
      course_id: typeof courseId === "string" && courseId ? courseId : null,
      title: generated.title,
      source_filename: file.name,
    })
    .select("id")
    .single()

  if (deckError) {
    return NextResponse.json({ error: deckError.message }, { status: 500 })
  }

  const { error: cardsError } = await supabase.from("flashcards").insert(
    generated.cards.map((c, index) => ({
      deck_id: deck.id,
      user_id: user.id,
      order_index: index,
      front: c.front,
      back: c.back,
    }))
  )

  if (cardsError) {
    await supabase.from("flashcard_decks").delete().eq("id", deck.id)
    return NextResponse.json({ error: cardsError.message }, { status: 500 })
  }

  return NextResponse.json({ deckId: deck.id })
}
