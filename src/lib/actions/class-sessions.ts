"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { classSessionSchema } from "@/lib/validators/class-sessions"
import type { Database } from "@/types/database.types"

export type ClassSessionActionState = {
  error?: string
} | null

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

function parseFormData(formData: FormData) {
  return classSessionSchema.safeParse({
    courseId: formData.get("courseId"),
    groupId: formData.get("groupId") || undefined,
    title: formData.get("title") || undefined,
    sessionType: formData.get("sessionType") || "lecture",
    location: formData.get("location") || undefined,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    specificDates: formData.getAll("specificDates").map(String).filter(Boolean),
    remarks: formData.get("remarks") || undefined,
    notes: formData.get("notes") || undefined,
  })
}

function toRow(
  data: ReturnType<typeof classSessionSchema.parse>,
  userId: string
): Database["public"]["Tables"]["class_sessions"]["Insert"] {
  return {
    user_id: userId,
    course_id: data.courseId,
    group_id: data.groupId ?? null,
    title: data.title ?? null,
    session_type: data.sessionType,
    location: data.location ?? null,
    is_recurring: false,
    day_of_week: null,
    start_time: data.startTime,
    end_time: data.endTime,
    specific_dates: data.specificDates,
    recurrence_start_date: null,
    recurrence_end_date: null,
    source: "manual",
    remarks: data.remarks ?? null,
    notes: data.notes ?? null,
  }
}

export async function createClassSession(
  _prevState: ClassSessionActionState,
  formData: FormData
): Promise<ClassSessionActionState> {
  const parsed = parseFormData(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { supabase, userId } = await requireUserId()
  const { error } = await supabase
    .from("class_sessions")
    .insert(toRow(parsed.data, userId))

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/timetable")
  revalidatePath("/calendar")
  return null
}

export async function updateClassSession(
  sessionId: string,
  _prevState: ClassSessionActionState,
  formData: FormData
): Promise<ClassSessionActionState> {
  const parsed = parseFormData(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { supabase, userId } = await requireUserId()
  const { error } = await supabase
    .from("class_sessions")
    .update(toRow(parsed.data, userId))
    .eq("id", sessionId)
    .eq("user_id", userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/timetable")
  revalidatePath("/calendar")
  return null
}

export async function updateSessionNotes(sessionId: string, notes: string) {
  const { supabase, userId } = await requireUserId()
  const { error } = await supabase
    .from("class_sessions")
    .update({ notes: notes.trim() || null })
    .eq("id", sessionId)
    .eq("user_id", userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/timetable")
  return null
}

export async function deleteClassSession(sessionId: string) {
  const { supabase, userId } = await requireUserId()
  await supabase
    .from("class_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId)

  revalidatePath("/timetable")
  revalidatePath("/calendar")
}

export async function deleteClassSessions(sessionIds: string[]) {
  if (sessionIds.length === 0) return

  const { supabase, userId } = await requireUserId()
  await supabase
    .from("class_sessions")
    .delete()
    .in("id", sessionIds)
    .eq("user_id", userId)

  revalidatePath("/timetable")
  revalidatePath("/calendar")
}
