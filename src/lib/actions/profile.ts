"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { CUSTOM_GRADING_SCALE_ID, type GradePoint } from "@/lib/grading-scales"
import { studyPreferencesSchema } from "@/lib/validators/study-plan"
import type { Json } from "@/types/database.types"

export type StudyPreferencesResult = {
  error?: string
  success?: boolean
}

export async function updateStudyPreferences(input: {
  studyType: string
  studyAvailability?: string
}): Promise<StudyPreferencesResult> {
  const parsed = studyPreferencesSchema.safeParse(input)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    study_type: parsed.data.studyType,
    study_availability: parsed.data.studyAvailability ?? null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  revalidatePath("/study-plan")
  return { success: true }
}

export type SchoolInfoResult = {
  error?: string
  success?: boolean
}

export async function updateSchoolInfo(input: {
  university?: string
}): Promise<SchoolInfoResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    university: input.university?.trim() || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export type GradingScaleResult = {
  error?: string
  success?: boolean
}

export async function updateGradingScale(input: {
  gradingScaleId: string
  customGradeScale?: GradePoint[]
}): Promise<GradingScaleResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  if (input.gradingScaleId === CUSTOM_GRADING_SCALE_ID && !input.customGradeScale?.length) {
    return { error: "Add at least one grade to your custom scale" }
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    grading_scale_id: input.gradingScaleId,
    custom_grade_scale:
      input.gradingScaleId === CUSTOM_GRADING_SCALE_ID
        ? ((input.customGradeScale as unknown as Json) ?? null)
        : null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  revalidatePath("/gpa-tracker")
  return { success: true }
}
