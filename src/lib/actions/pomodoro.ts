"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export type LogPomodoroSessionResult = {
  error?: string
}

export async function logPomodoroSession(input: {
  courseId: string | null
  sessionType: "focus" | "short_break" | "long_break"
  durationMinutes: number
}): Promise<LogPomodoroSessionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("pomodoro_sessions").insert({
    user_id: user.id,
    course_id: input.courseId,
    session_type: input.sessionType,
    duration_minutes: input.durationMinutes,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/pomodoro")
  return {}
}
