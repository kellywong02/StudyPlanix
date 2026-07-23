import { NextResponse, type NextRequest } from "next/server"
import { render } from "@react-email/render"

import { createAdminClient } from "@/lib/supabase/admin"
import { getResendClient } from "@/lib/email/resend"
import { ReminderEmail } from "@/lib/email/templates/reminder-email"
import type { Database } from "@/types/database.types"

const DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000
const EXAM_WINDOW_MS = 72 * 60 * 60 * 1000
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"]

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function todayISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const dueSoonCutoff = new Date(now.getTime() + DUE_SOON_WINDOW_MS).toISOString()
  const examCutoff = todayISODate(new Date(now.getTime() + EXAM_WINDOW_MS))
  const today = todayISODate(now)

  // 1. assignments due soon or overdue, across all users
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, user_id, title, due_date, status, courses(name)")
    .neq("status", "done")
    .lte("due_date", dueSoonCutoff)

  const assignmentNotifications: NotificationInsert[] = (assignments ?? []).map((a) => {
    const overdue = new Date(a.due_date) < now
    const courseName = a.courses?.name ?? "your course"
    return {
      user_id: a.user_id,
      type: overdue ? "assignment_overdue" : "assignment_due_soon",
      title: overdue ? `Overdue: ${a.title}` : `Due soon: ${a.title}`,
      body: overdue
        ? `${a.title} (${courseName}) was due ${new Date(a.due_date).toLocaleString()}.`
        : `${a.title} (${courseName}) is due ${new Date(a.due_date).toLocaleString()}.`,
      related_assignment_id: a.id,
      occurrence_date: null,
    }
  })

  // 2. upcoming exams (one-off class_sessions, possibly with multiple dates),
  // across all users — one notification per (session, occurrence date)
  const { data: exams } = await supabase
    .from("class_sessions")
    .select("id, user_id, title, specific_dates, start_time, courses(name)")
    .eq("session_type", "exam")
    .eq("is_recurring", false)

  const examNotifications: NotificationInsert[] = (exams ?? []).flatMap((e) => {
    const courseName = e.courses?.name ?? "your course"
    return (e.specific_dates ?? [])
      .filter((d) => d >= today && d <= examCutoff)
      .map((d) => ({
        user_id: e.user_id,
        type: "exam_upcoming" as const,
        title: `Upcoming exam: ${e.title || courseName}`,
        body: `${e.title || courseName} is on ${d} at ${e.start_time}.`,
        related_class_session_id: e.id,
        occurrence_date: d,
      }))
  })

  const toInsert = [...assignmentNotifications, ...examNotifications]

  if (toInsert.length > 0) {
    await supabase
      .from("notifications")
      .upsert(toInsert, {
        onConflict:
          "user_id,related_assignment_id,related_class_session_id,type,occurrence_date",
        ignoreDuplicates: true,
      })
  }

  // 3. send emails for anything not yet emailed (decoupled from the insert step
  // above so a prior send failure gets retried without re-inserting)
  const { data: pending } = await supabase
    .from("notifications")
    .select("*")
    .is("emailed_at", null)

  let emailsSent = 0
  const sendErrors: string[] = []
  const emailCache = new Map<string, string | null>()

  for (const notification of pending ?? []) {
    let email = emailCache.get(notification.user_id)
    if (email === undefined) {
      const { data } = await supabase.auth.admin.getUserById(notification.user_id)
      email = data.user?.email ?? null
      emailCache.set(notification.user_id, email)
    }
    if (!email) continue

    const actionUrl =
      notification.type === "exam_upcoming"
        ? `${SITE_URL}/exams`
        : `${SITE_URL}/assignments`
    const actionLabel = notification.type === "exam_upcoming" ? "View exams" : "View assignments"

    const html = await render(
      ReminderEmail({
        title: notification.title,
        body: notification.body ?? "",
        actionUrl,
        actionLabel,
      })
    )

    const resend = getResendClient()
    const { error } = await resend.emails.send({
      from: "StudyPlanix <onboarding@resend.dev>",
      to: email,
      subject: notification.title,
      html,
    })

    if (!error) {
      await supabase
        .from("notifications")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", notification.id)
      emailsSent++
    } else {
      sendErrors.push(`${email}: ${error.message}`)
    }
  }

  return NextResponse.json({
    notificationsCreated: toInsert.length,
    emailsSent,
    sendErrors,
  })
}
