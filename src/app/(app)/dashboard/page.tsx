import Link from "next/link"
import { redirect } from "next/navigation"
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Clock,
  Flame,
  GraduationCap,
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { isOverdue } from "@/lib/assignment-status"
import { computeStudyStreak, type FocusSession } from "@/lib/study-analytics"
import { sessionTypeLabel } from "@/lib/validators/class-sessions"
import { ComingSoonCard } from "@/components/coming-soon"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { SessionInfoDialog } from "@/components/session-info-dialog"
import { AssignmentInfoDialog } from "@/components/assignment-info-dialog"

function formatTime(time: string) {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${m} ${period}`
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDateWithDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dayName = DAY_NAMES[new Date(y, m - 1, d).getDay()]
  return `${dateStr} (${dayName})`
}

function StatCard({
  icon: Icon,
  label,
  value,
  colorClasses,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  colorClasses: string
}) {
  return (
    <div className={cn("rounded-xl border p-4", colorClasses)}>
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-white/60 dark:bg-white/10">
          <Icon className="size-4" />
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // belt-and-suspenders: the (app) layout already redirects unauthenticated
  // requests, but don't assume that always wins a race against this page's
  // own render
  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  const now = new Date()
  const todayDow = now.getDay()
  const todayDate = now.toISOString().slice(0, 10)
  const weekAheadDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const streakHistoryStart = new Date(now)
  streakHistoryStart.setDate(streakHistoryStart.getDate() - 90)

  const [{ data: allSessions }, { data: dueThisWeek }, { data: examSessions }, { data: focusLog }] =
    await Promise.all([
      supabase
        .from("class_sessions")
        .select("*, courses(name, color), course_groups(name)")
        .order("start_time"),
      supabase
        .from("assignments")
        .select("*, courses(name)")
        .neq("status", "done")
        .lte("due_date", weekAhead)
        .order("due_date"),
      supabase
        .from("class_sessions")
        .select("*, courses(name, color), course_groups(name)")
        .eq("session_type", "exam")
        .eq("is_recurring", false),
      supabase
        .from("pomodoro_sessions")
        .select("completed_at, duration_minutes")
        .eq("session_type", "focus")
        .gte("completed_at", streakHistoryStart.toISOString()),
    ])

  const focusSessions: FocusSession[] = (focusLog ?? []).map((s) => ({
    completedAt: s.completed_at,
    durationMinutes: s.duration_minutes,
    courseId: null,
    courseName: null,
    color: null,
  }))
  const studyStreak = computeStudyStreak(focusSessions, now)

  const todaysClasses = (allSessions ?? []).filter(
    (s) =>
      (s.is_recurring && s.day_of_week === todayDow) ||
      (!s.is_recurring && s.specific_dates?.includes(todayDate))
  )

  // every class happening in the next week, excluding today's (already
  // covered above) — non-recurring sessions can have several dates within
  // the window, recurring ones get their next weekly occurrence computed
  const upcomingClasses = (allSessions ?? [])
    .filter((s) => s.session_type !== "exam")
    .flatMap((s) => {
      if (!s.is_recurring) {
        return (s.specific_dates ?? [])
          .filter((d) => d > todayDate && d <= weekAheadDate)
          .map((nextDate) => ({ ...s, nextDate }))
      }
      for (let i = 1; i <= 7; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() + i)
        if (d.getDay() === s.day_of_week) {
          return [{ ...s, nextDate: d.toISOString().slice(0, 10) }]
        }
      }
      return []
    })
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate))

  // notes written on a class carry forward to the next occurrence of that
  // course and session type (same logic as the Timetable page), so a
  // reminder written last lesson shows up here on the dashboard too. Each
  // class's position in that same chronological order (per type — "Lab 1,
  // Lab 2..." and "Lecture 1, Lecture 2..." count independently) is its
  // lesson number.
  const previousLessonNotes = new Map<string, string>()
  const lessonNumbers = new Map<string, number>()
  const datedClassesByCourse = new Map<string, NonNullable<typeof allSessions>>()
  for (const s of allSessions ?? []) {
    if (s.is_recurring || s.session_type === "exam") continue
    const key = `${s.course_id}::${s.session_type}`
    const list = datedClassesByCourse.get(key) ?? []
    list.push(s)
    datedClassesByCourse.set(key, list)
  }
  for (const list of datedClassesByCourse.values()) {
    const sorted = [...list].sort((a, b) =>
      (a.specific_dates?.[0] ?? "").localeCompare(b.specific_dates?.[0] ?? "")
    )
    sorted.forEach((s, i) => lessonNumbers.set(s.id, i + 1))
    for (let i = 1; i < sorted.length; i++) {
      const prevNotes = sorted[i - 1].notes
      if (prevNotes) previousLessonNotes.set(sorted[i].id, prevNotes)
    }
  }

  // how many classes are left (vs. already happened) per course, based on
  // every dated session entered for it — dated rows count each date
  // directly; legacy weekly-recurring rows are expanded across their term
  // range since they don't carry individual dates
  type CourseProgress = { courseId: string; name: string; color: string; completed: number; remaining: number }
  const progressByCourse = new Map<string, CourseProgress>()
  for (const s of allSessions ?? []) {
    if (s.session_type === "exam") continue
    const entry = progressByCourse.get(s.course_id) ?? {
      courseId: s.course_id,
      name: s.courses?.name ?? "Unknown course",
      color: s.courses?.color ?? "#3b82f6",
      completed: 0,
      remaining: 0,
    }
    if (!s.is_recurring) {
      for (const d of s.specific_dates ?? []) {
        if (d < todayDate) entry.completed++
        else entry.remaining++
      }
    } else if (s.recurrence_end_date) {
      const start = s.recurrence_start_date ? new Date(s.recurrence_start_date) : now
      const end = new Date(s.recurrence_end_date)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== s.day_of_week) continue
        if (d.toISOString().slice(0, 10) < todayDate) entry.completed++
        else entry.remaining++
      }
    }
    progressByCourse.set(s.course_id, entry)
  }
  const courseProgress = [...progressByCourse.values()]
    .filter((c) => c.completed + c.remaining > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  // each exam session may list multiple dates — surface only the soonest
  // upcoming one per session, sorted across sessions, capped to 5
  const upcomingExams = (examSessions ?? [])
    .map((e) => ({
      ...e,
      nextDate: (e.specific_dates ?? []).filter((d) => d >= todayDate).sort()[0],
    }))
    .filter((e) => e.nextDate)
    .sort((a, b) => a.nextDate!.localeCompare(b.nextDate!))
    .slice(0, 5)

  const displayName = profile?.full_name?.split(" ")[0] ?? ""

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back{displayName ? `, ${displayName}` : ""}! 👋
        </h1>
        <p className="text-muted-foreground">Let&apos;s make today productive.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Today's Classes"
          value={todaysClasses.length}
          colorClasses="bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900"
        />
        <StatCard
          icon={ClipboardList}
          label="Assignments Due This Week"
          value={dueThisWeek?.length ?? 0}
          colorClasses="bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
        />
        <StatCard
          icon={GraduationCap}
          label="Upcoming Exams"
          value={upcomingExams?.length ?? 0}
          colorClasses="bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
        />
        <StatCard
          icon={Flame}
          label="Study Streak"
          value={`${studyStreak.current}d`}
          colorClasses="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="size-4 text-muted-foreground" />
              Today&apos;s Classes
            </CardTitle>
            <Link href="/timetable" className="text-xs text-primary hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3">
            {todaysClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled today.</p>
            ) : (
              todaysClasses.map((s) => (
                <SessionInfoDialog
                  key={s.id}
                  title={s.title || s.courses?.name || ""}
                  courseName={s.courses?.name}
                  dateLabel="Today"
                  timeLabel={`${formatTime(s.start_time)} – ${formatTime(s.end_time)}`}
                  location={s.location}
                  groupName={s.course_groups?.name}
                  remarks={s.remarks}
                  notes={s.notes}
                  previousLessonNotes={previousLessonNotes.get(s.id)}
                  lessonNumber={lessonNumbers.get(s.id)}
                  sessionType={s.session_type}
                  courseId={s.course_id}
                  sessionId={s.id}
                  trigger={
                    <div
                      className="flex cursor-pointer items-center gap-2 border-l-2 pl-3 hover:opacity-80"
                      style={{ borderColor: s.courses?.color ?? "#3b82f6" }}
                    >
                      <div className="grid gap-0.5">
                        <p className="text-sm font-medium">
                          {s.title || s.courses?.name}
                          {lessonNumbers.get(s.id) && (
                            <span className="ml-1.5 font-normal text-muted-foreground">
                              · {sessionTypeLabel(s.session_type)} {lessonNumbers.get(s.id)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(s.start_time)} – {formatTime(s.end_time)}
                          {s.location ? ` · ${s.location}` : ""}
                        </p>
                      </div>
                    </div>
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="size-4 text-muted-foreground" />
              Upcoming Classes
            </CardTitle>
            <Link href="/timetable" className="text-xs text-primary hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent className="grid max-h-72 gap-3 overflow-y-auto">
            {upcomingClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing coming up this week.</p>
            ) : (
              upcomingClasses.map((s) => (
                <SessionInfoDialog
                  key={`${s.id}-${s.nextDate}`}
                  title={s.title || s.courses?.name || ""}
                  courseName={s.courses?.name}
                  dateLabel={formatDateWithDay(s.nextDate)}
                  timeLabel={`${formatTime(s.start_time)} – ${formatTime(s.end_time)}`}
                  location={s.location}
                  groupName={s.course_groups?.name}
                  remarks={s.remarks}
                  notes={s.notes}
                  previousLessonNotes={previousLessonNotes.get(s.id)}
                  lessonNumber={lessonNumbers.get(s.id)}
                  sessionType={s.session_type}
                  courseId={s.course_id}
                  sessionId={s.id}
                  trigger={
                    <div
                      className="flex cursor-pointer items-center gap-2 border-l-2 pl-3 hover:opacity-80"
                      style={{ borderColor: s.courses?.color ?? "#3b82f6" }}
                    >
                      <div className="grid gap-0.5">
                        <p className="text-sm font-medium">
                          {s.title || s.courses?.name}
                          {lessonNumbers.get(s.id) && (
                            <span className="ml-1.5 font-normal text-muted-foreground">
                              · {sessionTypeLabel(s.session_type)} {lessonNumbers.get(s.id)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateWithDay(s.nextDate)} · {formatTime(s.start_time)} –{" "}
                          {formatTime(s.end_time)}
                        </p>
                      </div>
                    </div>
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="size-4 text-muted-foreground" />
              Assignments Due This Week
            </CardTitle>
            <Link href="/assignments" className="text-xs text-primary hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!dueThisWeek?.length ? (
              <p className="text-sm text-muted-foreground">Nothing due this week.</p>
            ) : (
              dueThisWeek.map((a) => (
                <AssignmentInfoDialog
                  key={a.id}
                  title={a.title}
                  courseName={a.courses?.name}
                  dueDateLabel={new Date(a.due_date).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  status={a.status}
                  priority={a.priority}
                  description={a.description}
                  overdue={isOverdue(a.due_date, a.status)}
                  courseId={a.course_id}
                  assignmentId={a.id}
                  trigger={
                    <div className="flex cursor-pointer items-center justify-between gap-2 hover:underline">
                      <div>
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.courses?.name}</p>
                      </div>
                      {isOverdue(a.due_date, a.status) && (
                        <Badge variant="destructive">Overdue</Badge>
                      )}
                    </div>
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <GraduationCap className="size-4 text-muted-foreground" />
              Upcoming Exams
            </CardTitle>
            <Link href="/exams" className="text-xs text-primary hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!upcomingExams?.length ? (
              <p className="text-sm text-muted-foreground">No exams scheduled.</p>
            ) : (
              upcomingExams.map((e) => (
                <SessionInfoDialog
                  key={e.id}
                  title={e.title || e.courses?.name || ""}
                  courseName={e.courses?.name}
                  dateLabel={formatDateWithDay(e.nextDate!)}
                  timeLabel={`${formatTime(e.start_time)} – ${formatTime(e.end_time)}`}
                  location={e.location}
                  groupName={e.course_groups?.name}
                  remarks={e.remarks}
                  notes={e.notes}
                  courseId={e.course_id}
                  sessionId={e.id}
                  trigger={
                    <div className="grid cursor-pointer gap-0.5 hover:underline">
                      <p className="text-sm font-medium">{e.title || e.courses?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.nextDate} · {formatTime(e.start_time)} – {formatTime(e.end_time)}
                      </p>
                    </div>
                  }
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ComingSoonCard
          icon={Clock}
          title="Today's Study Plan"
          description="AI-generated daily study plans are coming in a future update."
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="size-4 text-muted-foreground" />
              Classes Left This Semester
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {courseProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes scheduled yet.</p>
            ) : (
              courseProgress.map((c) => {
                const total = c.completed + c.remaining
                const pct = total > 0 ? Math.round((c.completed / total) * 100) : 0
                return (
                  <div key={c.courseId} className="grid gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c.remaining} left
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
        <ComingSoonCard
          icon={BarChart3}
          title="GPA Tracker"
          description="See your GPA trend across semesters and track it against your goal."
        />
      </div>
    </div>
  )
}
