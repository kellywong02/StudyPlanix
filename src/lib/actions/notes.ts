"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { noteSchema } from "@/lib/validators/notes"
import type { Json } from "@/types/database.types"

export type NoteResult = {
  error?: string
  id?: string
}

async function requireUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }
  return { supabase, userId: user.id }
}

export async function createNote(input: {
  title: string
  courseId: string | null
  content: unknown
}): Promise<NoteResult> {
  const parsed = noteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { supabase, userId } = await requireUserId()
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      course_id: parsed.data.courseId,
      title: parsed.data.title,
      content: parsed.data.content as Json,
    })
    .select("id")
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/notes")
  return { id: data.id }
}

export async function updateNote(
  noteId: string,
  input: { title: string; courseId: string | null; content: unknown }
): Promise<NoteResult> {
  const parsed = noteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { supabase, userId } = await requireUserId()
  const { error } = await supabase
    .from("notes")
    .update({
      course_id: parsed.data.courseId,
      title: parsed.data.title,
      content: parsed.data.content as Json,
    })
    .eq("id", noteId)
    .eq("user_id", userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/notes")
  return {}
}

export async function deleteNote(noteId: string) {
  const { supabase, userId } = await requireUserId()
  await supabase.from("notes").delete().eq("id", noteId).eq("user_id", userId)

  revalidatePath("/notes")
}
