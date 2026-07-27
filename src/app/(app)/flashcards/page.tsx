import { createClient } from "@/lib/supabase/server"

import { FlashcardsWorkspace } from "./flashcards-workspace"

export default async function FlashcardsPage() {
  const supabase = await createClient()

  const [{ data: decks }, { data: courses }] = await Promise.all([
    supabase
      .from("flashcard_decks")
      .select("*, courses(name, color), flashcards(count)")
      .order("created_at", { ascending: false }),
    supabase.from("courses").select("id, name, color").eq("archived", false).order("name"),
  ])

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Flashcards</h1>
      <FlashcardsWorkspace decks={decks ?? []} courses={courses ?? []} />
    </div>
  )
}
