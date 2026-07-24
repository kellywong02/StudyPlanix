"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

// Simple 3-box Leitner system: a correct review pushes a card further out,
// a missed review sends it back to box 1 for near-term re-review.
const BOX_INTERVAL_DAYS: Record<number, number> = { 1: 1, 2: 3, 3: 7 }

export type ReviewFlashcardResult = {
  error?: string
  box?: number
  nextReviewAt?: string
}

export async function reviewFlashcard(
  cardId: string,
  gotIt: boolean
): Promise<ReviewFlashcardResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: card, error: fetchError } = await supabase
    .from("flashcards")
    .select("box, deck_id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !card) {
    return { error: "Flashcard not found" }
  }

  const newBox = gotIt ? Math.min(card.box + 1, 3) : 1
  const now = new Date()
  const nextReviewAt = new Date(now.getTime() + BOX_INTERVAL_DAYS[newBox] * 24 * 60 * 60 * 1000)

  const { error: updateError } = await supabase
    .from("flashcards")
    .update({
      box: newBox,
      next_review_at: nextReviewAt.toISOString(),
      last_reviewed_at: now.toISOString(),
    })
    .eq("id", cardId)
    .eq("user_id", user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath(`/flashcards/${card.deck_id}`)
  revalidatePath("/flashcards")
  return { box: newBox, nextReviewAt: nextReviewAt.toISOString() }
}

export async function deleteFlashcardDeck(deckId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from("flashcard_decks").delete().eq("id", deckId).eq("user_id", user.id)
  revalidatePath("/flashcards")
}
