"use server"

import { revalidatePath } from "next/cache"

import {
  generateStudyPlan as callAiStudyPlanner,
  type StudyPlanAssignmentContext,
  type StudyPlanBusyBlock,
  type StudyPlanExamContext,
} from "@/lib/ai/generate-study-plan"
import { createClient } from "@/lib/supabase/server"
import { STUDY_TYPES } from "@/lib/validators/study-plan"

export type StudyPlanResult = {
  error?: string
  success?: boolean
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

function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

export async function generateStudyPlan(): Promise<StudyPlanResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "AI study planner is not configured. Set OPENAI_API_KEY." }
  }

  const { supabase, userId } = await requireUserId()
  const today = todayISODate()

  const [{ data: profile }, { data: courses }, { data: assignments }, { data: sessions }] =
    await Promise.all([
      supabase.from("profiles").select("study_type, study_availability").eq("id", userId).single(),
      supabase.from("courses").select("id, name").eq("archived", false),
      supabase
        .from("assignments")
        .select("id, title, course_id, due_date, priority, status")
        .neq("status", "done")
        .gte("due_date", today),
      supabase
        .from("class_sessions")
        .select("id, course_id, title, session_type, is_recurring, day_of_week, start_time, end_time, specific_dates, courses(name)"),
    ])

  if (!profile) {
    return { error: "Could not load your study preferences." }
  }

  const studyType = STUDY_TYPES.includes(profile.study_type as (typeof STUDY_TYPES)[number])
    ? (profile.study_type as (typeof STUDY_TYPES)[number])
    : "full_time"

  const courseList = courses ?? []
  const allowedCourseIds = new Set(courseList.map((c) => c.id))

  const assignmentContexts: StudyPlanAssignmentContext[] = (assignments ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    courseId: a.course_id,
    dueDate: a.due_date.slice(0, 10),
    priority: a.priority,
  }))
  const allowedAssignmentIds = new Set(assignmentContexts.map((a) => a.id))

  const examContexts: StudyPlanExamContext[] = (sessions ?? [])
    .filter((s) => s.session_type === "exam" && s.specific_dates?.some((d) => d >= today))
    .map((s) => ({
      courseId: s.course_id,
      title: s.title || s.courses?.name || "Exam",
      dates: (s.specific_dates ?? []).filter((d) => d >= today),
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time.slice(0, 5),
    }))

  const busyBlocks: StudyPlanBusyBlock[] = (sessions ?? [])
    .filter((s) => s.is_recurring && s.day_of_week !== null)
    .map((s) => ({
      dayOfWeek: s.day_of_week!,
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time.slice(0, 5),
      title: s.title || s.courses?.name || "Class",
    }))

  if (assignmentContexts.length === 0 && examContexts.length === 0) {
    return { error: "Add some assignments or exams first so there's something to plan around." }
  }

  let plan
  try {
    plan = await callAiStudyPlanner({
      studyType,
      studyAvailability: profile.study_availability,
      today,
      courses: courseList,
      assignments: assignmentContexts,
      exams: examContexts,
      busyBlocks,
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to generate a study plan." }
  }

  const validSessions = plan.sessions.filter(
    (s) =>
      s.date >= today &&
      (s.assignmentId === null || allowedAssignmentIds.has(s.assignmentId)) &&
      (s.courseId === null || allowedCourseIds.has(s.courseId))
  )

  if (validSessions.length === 0) {
    return { error: "The AI could not find a workable plan. Try again or adjust your availability notes." }
  }

  // replace any previously planned (not yet completed) future sessions
  await supabase
    .from("study_plan_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("status", "planned")
    .gte("session_date", today)

  const { error } = await supabase.from("study_plan_sessions").insert(
    validSessions.map((s) => ({
      user_id: userId,
      course_id: s.courseId,
      assignment_id: s.assignmentId,
      title: s.title,
      session_date: s.date,
      start_time: s.startTime,
      end_time: s.endTime,
      notes: s.notes,
    }))
  )

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/study-plan")
  revalidatePath("/calendar")
  return { success: true }
}

export async function updateStudyPlanSessionStatus(
  sessionId: string,
  status: "planned" | "done" | "skipped"
) {
  const { supabase, userId } = await requireUserId()
  await supabase
    .from("study_plan_sessions")
    .update({ status })
    .eq("id", sessionId)
    .eq("user_id", userId)

  revalidatePath("/study-plan")
}

export async function deleteStudyPlanSession(sessionId: string) {
  const { supabase, userId } = await requireUserId()
  await supabase
    .from("study_plan_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId)

  revalidatePath("/study-plan")
}
