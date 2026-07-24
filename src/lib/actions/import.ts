"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import type { ParsedSessionRow } from "@/lib/import/types"
import type { Database } from "@/types/database.types"

export type CourseSelection =
  | { type: "existing"; courseId: string }
  | { type: "new" }

export type CommitRow = ParsedSessionRow & { courseSelection: CourseSelection }

export type CommitResult = {
  error?: string
  created?: number
  updated?: number
  unchanged?: number
}

export async function commitImportRows(rows: CommitRow[]): Promise<CommitResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const validRows = rows.filter((r) => !r.error)
  if (validRows.length === 0) {
    return { error: "No valid rows to import" }
  }

  // 1. find-or-create courses for rows marked "new", deduped by (code || name)
  const newRowsByKey = new Map<string, CommitRow>()
  for (const row of validRows) {
    if (row.courseSelection.type === "new") {
      const key = (row.courseCode || row.courseName).toLowerCase()
      if (!newRowsByKey.has(key)) newRowsByKey.set(key, row)
    }
  }

  const courseIdByKey = new Map<string, string>()

  if (newRowsByKey.size > 0) {
    const { data: existingCourses } = await supabase
      .from("courses")
      .select("id, name, code")
      .eq("user_id", user.id)

    for (const [key, row] of newRowsByKey) {
      const match = existingCourses?.find(
        (c) =>
          (row.courseCode && c.code?.toLowerCase() === row.courseCode.toLowerCase()) ||
          c.name.toLowerCase() === row.courseName.toLowerCase()
      )
      if (match) {
        courseIdByKey.set(key, match.id)
      }
    }

    const toCreate = [...newRowsByKey.entries()].filter(([key]) => !courseIdByKey.has(key))
    if (toCreate.length > 0) {
      const { data: inserted, error } = await supabase
        .from("courses")
        .insert(
          toCreate.map(([, row]) => ({
            user_id: user.id,
            name: row.courseName,
            code: row.courseCode || null,
          }))
        )
        .select("id, name, code")

      if (error) {
        return { error: error.message }
      }

      toCreate.forEach(([key, row], i) => {
        const created = inserted?.find(
          (c) =>
            c.name === row.courseName && (row.courseCode ? c.code === row.courseCode : true)
        )
        courseIdByKey.set(key, created?.id ?? inserted![i].id)
      })
    }
  }

  function resolveCourseId(row: CommitRow): string | null {
    if (row.courseSelection.type === "existing") return row.courseSelection.courseId
    const key = (row.courseCode || row.courseName).toLowerCase()
    return courseIdByKey.get(key) ?? null
  }

  // 1b. find-or-create course_groups for rows that specify a Group (e.g. "Tutorial
  // Group 3"), deduped by (resolved course_id, group name)
  const groupKeyToId = new Map<string, string>()
  const rowsWithGroup = validRows.filter((r) => r.groupName)

  if (rowsWithGroup.length > 0) {
    const courseIdsNeeded = [
      ...new Set(rowsWithGroup.map((r) => resolveCourseId(r)).filter(Boolean)),
    ] as string[]

    const { data: existingGroups } = await supabase
      .from("course_groups")
      .select("id, course_id, name")
      .eq("user_id", user.id)
      .in("course_id", courseIdsNeeded)

    const groupsToCreate = new Map<string, { course_id: string; name: string }>()
    for (const row of rowsWithGroup) {
      const courseId = resolveCourseId(row)
      if (!courseId) continue
      const key = `${courseId}|${row.groupName!.toLowerCase()}`
      if (groupKeyToId.has(key) || groupsToCreate.has(key)) continue
      const match = existingGroups?.find(
        (g) => g.course_id === courseId && g.name.toLowerCase() === row.groupName!.toLowerCase()
      )
      if (match) {
        groupKeyToId.set(key, match.id)
      } else {
        groupsToCreate.set(key, { course_id: courseId, name: row.groupName! })
      }
    }

    if (groupsToCreate.size > 0) {
      const entries = [...groupsToCreate.entries()]
      const { data: inserted, error } = await supabase
        .from("course_groups")
        .insert(
          entries.map(([, g]) => ({
            user_id: user.id,
            course_id: g.course_id,
            name: g.name,
          }))
        )
        .select("id, course_id, name")

      if (error) {
        return { error: error.message }
      }

      entries.forEach(([key, g], i) => {
        const created = inserted?.find(
          (r) => r.course_id === g.course_id && r.name === g.name
        )
        groupKeyToId.set(key, created?.id ?? inserted![i].id)
      })
    }
  }

  function resolveGroupId(row: CommitRow): string | null {
    if (!row.groupName) return null
    const courseId = resolveCourseId(row)
    if (!courseId) return null
    const key = `${courseId}|${row.groupName.toLowerCase()}`
    return groupKeyToId.get(key) ?? null
  }

  const icsRows = validRows.filter((r) => r.source === "ics")
  // xlsx and pdf rows have no stable external id, so both are deduped
  // against existing sessions by composite key rather than upserted
  const rowsWithoutUid = validRows.filter((r) => r.source !== "ics")

  let created = 0
  let updated = 0
  let unchanged = 0

  // 2. ICS rows: upsert on (user_id, external_uid) — re-importing the same
  // calendar updates existing rows instead of duplicating them
  if (icsRows.length > 0) {
    const payload: Database["public"]["Tables"]["class_sessions"]["Insert"][] = []
    for (const row of icsRows) {
      const courseId = resolveCourseId(row)
      if (!courseId) continue
      payload.push({
        user_id: user.id,
        course_id: courseId,
        group_id: resolveGroupId(row),
        title: row.title,
        session_type: row.sessionType,
        location: row.location,
        is_recurring: row.isRecurring,
        day_of_week: row.isRecurring ? row.dayOfWeek : null,
        start_time: row.startTime,
        end_time: row.endTime,
        specific_dates: row.isRecurring ? null : row.specificDate ? [row.specificDate] : null,
        recurrence_start_date: row.isRecurring ? row.recurrenceStartDate : null,
        recurrence_end_date: row.isRecurring ? row.recurrenceEndDate : null,
        source: "ics_import",
        external_uid: row.externalUid,
        remarks: row.remarks,
      })
    }

    if (payload.length > 0) {
      const { data: existing } = await supabase
        .from("class_sessions")
        .select("external_uid")
        .eq("user_id", user.id)
        .in("external_uid", payload.map((p) => p.external_uid!))

      const existingUids = new Set(existing?.map((e) => e.external_uid))

      const { error } = await supabase
        .from("class_sessions")
        .upsert(payload, { onConflict: "user_id,external_uid" })

      if (error) {
        return { error: error.message }
      }

      payload.forEach((p) => {
        if (p.external_uid && existingUids.has(p.external_uid)) updated++
        else created++
      })
    }
  }

  // 3. xlsx/pdf rows: no stable UID, so dedupe against what's already in the
  // DB — recurring rows key on (course_id, day_of_week, start_time,
  // end_time, recurrence_start_date); one-off rows key on (course_id,
  // specific_date, start_time, end_time)
  if (rowsWithoutUid.length > 0) {
    const courseIds = [...new Set(rowsWithoutUid.map((r) => resolveCourseId(r)).filter(Boolean))]
    const { data: existingSessions } = await supabase
      .from("class_sessions")
      .select("course_id, day_of_week, start_time, end_time, recurrence_start_date, specific_dates")
      .eq("user_id", user.id)
      .in("course_id", courseIds as string[])

    const existingKeys = new Set<string>()
    for (const s of existingSessions ?? []) {
      if (s.day_of_week !== null) {
        existingKeys.add(
          `R:${s.course_id}|${s.day_of_week}|${s.start_time}|${s.end_time}|${s.recurrence_start_date}`
        )
      }
      for (const d of s.specific_dates ?? []) {
        existingKeys.add(`O:${s.course_id}|${d}|${s.start_time}|${s.end_time}`)
      }
    }

    const toInsert: Database["public"]["Tables"]["class_sessions"]["Insert"][] = []
    for (const row of rowsWithoutUid) {
      const courseId = resolveCourseId(row)
      if (!courseId) continue
      const key = row.isRecurring
        ? `R:${courseId}|${row.dayOfWeek}|${row.startTime}:00|${row.endTime}:00|${row.recurrenceStartDate}`
        : `O:${courseId}|${row.specificDate}|${row.startTime}:00|${row.endTime}:00`
      if (existingKeys.has(key)) {
        unchanged++
        continue
      }
      toInsert.push({
        user_id: user.id,
        course_id: courseId,
        group_id: resolveGroupId(row),
        title: row.title,
        session_type: row.sessionType,
        location: row.location,
        is_recurring: row.isRecurring,
        day_of_week: row.isRecurring ? row.dayOfWeek : null,
        start_time: row.startTime,
        end_time: row.endTime,
        specific_dates: row.isRecurring ? null : row.specificDate ? [row.specificDate] : null,
        recurrence_start_date: row.isRecurring ? row.recurrenceStartDate : null,
        recurrence_end_date: row.isRecurring ? row.recurrenceEndDate : null,
        source: row.source === "pdf" ? "pdf_import" : "xlsx_import",
        external_uid: null,
        remarks: row.remarks,
      })
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from("class_sessions").insert(toInsert)
      if (error) {
        return { error: error.message }
      }
      created += toInsert.length
    }
  }

  revalidatePath("/timetable")
  revalidatePath("/calendar")
  revalidatePath("/courses")
  revalidatePath("/exams")
  revalidatePath("/dashboard")

  return { created, updated, unchanged }
}
