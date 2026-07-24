import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

import { FlashcardReviewer } from "./flashcard-reviewer"

export default async function FlashcardDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: deck }, { data: cards }] = await Promise.all([
    supabase.from("flashcard_decks").select("*, courses(name, color)").eq("id", id).single(),
    supabase.from("flashcards").select("*").eq("deck_id", id).order("order_index"),
  ])

  if (!deck || !cards || cards.length === 0) {
    notFound()
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{deck.title}</h1>
        {deck.courses && <p className="text-sm text-muted-foreground">{deck.courses.name}</p>}
      </div>
      <FlashcardReviewer cards={cards} />
    </div>
  )
}
