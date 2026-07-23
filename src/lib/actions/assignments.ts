"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { assignmentSchema } from "@/lib/validators/assignments"

export type AssignmentActionState = {
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
  return assignmentSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dueDate: formData.get("dueDate"),
    status: formData.get("status") || "not_started",
    priority: formData.get("priority") || undefined,
  })
}

export async function createAssignment(
  _prevState: AssignmentActionState,
  formData: FormData
): Promise<AssignmentActionState> {
  const parsed = parseFormData(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { supabase, userId } = await requireUserId()
  const { error } = await supabase.from("assignments").insert({
    user_id: userId,
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    due_date: new Date(parsed.data.dueDate).toISOString(),
    status: parsed.data.status,
    priority: parsed.data.priority ?? null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/assignments")
  revalidatePath("/dashboard")
  revalidatePath("/calendar")
  return null
}

export async function updateAssignment(
  assignmentId: string,
  _prevState: AssignmentActionState,
  formData: FormData
): Promise<AssignmentActionState> {
  const parsed = parseFormData(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { supabase, userId } = await requireUserId()
  const { error } = await supabase
    .from("assignments")
    .update({
      course_id: parsed.data.courseId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      due_date: new Date(parsed.data.dueDate).toISOString(),
      status: parsed.data.status,
      priority: parsed.data.priority ?? null,
    })
    .eq("id", assignmentId)
    .eq("user_id", userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/assignments")
  revalidatePath("/dashboard")
  revalidatePath("/calendar")
  return null
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: "not_started" | "in_progress" | "done"
) {
  const { supabase, userId } = await requireUserId()
  await supabase
    .from("assignments")
    .update({ status })
    .eq("id", assignmentId)
    .eq("user_id", userId)

  revalidatePath("/assignments")
  revalidatePath("/dashboard")
  revalidatePath("/calendar")
}

export async function deleteAssignment(assignmentId: string) {
  const { supabase, userId } = await requireUserId()
  await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("user_id", userId)

  revalidatePath("/assignments")
  revalidatePath("/dashboard")
  revalidatePath("/calendar")
}
