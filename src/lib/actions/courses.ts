"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { courseSchema, type CourseGroupInput } from "@/lib/validators/courses"

export type CourseActionState = {
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

function parseGroupsJson(formData: FormData): CourseGroupInput[] {
  const raw = formData.get("groupsJson")
  if (!raw) return []
  try {
    const parsed = JSON.parse(String(raw))
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((g) => g && typeof g.name === "string" && g.name.trim())
      .map((g) => ({
        name: g.name,
        instructor: g.instructor || undefined,
        instructorEmail: g.instructorEmail || undefined,
      }))
  } catch {
    return []
  }
}

export async function createCourse(
  _prevState: CourseActionState,
  formData: FormData
): Promise<CourseActionState> {
  const parsed = courseSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code") || undefined,
    color: formData.get("color") || undefined,
    location: formData.get("location") || undefined,
    term: formData.get("term") || undefined,
    groups: parseGroupsJson(formData),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { groups, ...rest } = parsed.data
  const { supabase, userId } = await requireUserId()

  const { data: course, error } = await supabase
    .from("courses")
    .insert({ ...rest, user_id: userId })
    .select("id")
    .single()

  if (error) {
    return { error: error.message }
  }

  if (groups && groups.length > 0) {
    const { error: groupsError } = await supabase.from("course_groups").insert(
      groups.map((g) => ({
        course_id: course.id,
        user_id: userId,
        name: g.name,
        instructor: g.instructor ?? null,
        instructor_email: g.instructorEmail ?? null,
      }))
    )
    if (groupsError) {
      return { error: groupsError.message }
    }
  }

  revalidatePath("/courses")
  revalidatePath("/timetable")
  return null
}

export async function updateCourse(
  courseId: string,
  _prevState: CourseActionState,
  formData: FormData
): Promise<CourseActionState> {
  const parsed = courseSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code") || undefined,
    color: formData.get("color") || undefined,
    location: formData.get("location") || undefined,
    term: formData.get("term") || undefined,
    groups: parseGroupsJson(formData),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { groups, ...rest } = parsed.data
  const { supabase, userId } = await requireUserId()

  const { error } = await supabase
    .from("courses")
    .update(rest)
    .eq("id", courseId)
    .eq("user_id", userId)

  if (error) {
    return { error: error.message }
  }

  // replace the full group set for this course rather than diffing
  await supabase
    .from("course_groups")
    .delete()
    .eq("course_id", courseId)
    .eq("user_id", userId)

  if (groups && groups.length > 0) {
    const { error: groupsError } = await supabase.from("course_groups").insert(
      groups.map((g) => ({
        course_id: courseId,
        user_id: userId,
        name: g.name,
        instructor: g.instructor ?? null,
        instructor_email: g.instructorEmail ?? null,
      }))
    )
    if (groupsError) {
      return { error: groupsError.message }
    }
  }

  revalidatePath("/courses")
  revalidatePath("/timetable")
  return null
}

export async function archiveCourse(courseId: string) {
  const { supabase, userId } = await requireUserId()
  await supabase
    .from("courses")
    .update({ archived: true })
    .eq("id", courseId)
    .eq("user_id", userId)

  revalidatePath("/courses")
  revalidatePath("/timetable")
}

export async function deleteCourse(courseId: string) {
  const { supabase, userId } = await requireUserId()
  await supabase.from("courses").delete().eq("id", courseId).eq("user_id", userId)

  revalidatePath("/courses")
  revalidatePath("/timetable")
}
