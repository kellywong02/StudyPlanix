"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export async function deleteFlashcardDeck(deckId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from("flashcard_decks").delete().eq("id", deckId).eq("user_id", user.id)
  revalidatePath("/flashcards")
}
