import { createClient } from "@/lib/supabase/server"
import type { ClassSessionLike, AssignmentLike } from "@/lib/calendar/expand-recurrence"

import { CalendarView } from "./calendar-view"

export default async function CalendarPage() {
  const supabase = await createClient()

  const [{ data: sessions }, { data: assignments }] = await Promise.all([
    supabase
      .from("class_sessions")
      .select("*, courses(name, color), course_groups(name)"),
    supabase.from("assignments").select("*, courses(name, color)"),
  ])

  const sessionLikes: ClassSessionLike[] = (sessions ?? []).map((s) => ({
    id: s.id,
    courseId: s.course_id,
    title: s.title,
    courseName: s.courses?.name ?? "Course",
    color: s.courses?.color ?? "#3b82f6",
    sessionType: s.session_type,
    location: s.location,
    groupName: s.course_groups?.name ?? null,
    remarks: s.remarks,
    notes: s.notes,
    isRecurring: s.is_recurring,
    dayOfWeek: s.day_of_week,
    startTime: s.start_time,
    endTime: s.end_time,
    specificDates: s.specific_dates,
    recurrenceStartDate: s.recurrence_start_date,
    recurrenceEndDate: s.recurrence_end_date,
  }))

  const assignmentLikes: AssignmentLike[] = (assignments ?? []).map((a) => ({
    id: a.id,
    courseId: a.course_id,
    title: a.title,
    courseName: a.courses?.name ?? "Course",
    color: a.courses?.color ?? "#a1a1aa",
    dueDate: a.due_date,
    status: a.status,
    priority: a.priority,
    description: a.description,
  }))

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <CalendarView sessions={sessionLikes} assignments={assignmentLikes} />
    </div>
  )
}
