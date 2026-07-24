import { createClient } from "@/lib/supabase/server"
import { isOverdue } from "@/lib/assignment-status"
import {
  computeStudyStreak,
  dailyFocusMinutes,
  focusMinutesByCourse,
  type FocusSession,
} from "@/lib/study-analytics"
import { Card, CardContent } from "@/components/ui/card"

import { StudyTimeChart } from "./study-time-chart"

const HISTORY_DAYS = 90
const CHART_DAYS = 14

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="grid gap-1 py-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

export default async function StudyAnalyticsPage() {
  const supabase = await createClient()

  const historyStart = new Date()
  historyStart.setDate(historyStart.getDate() - HISTORY_DAYS)

  const [{ data: pomodoroSessions }, { data: assignments }] = await Promise.all([
    supabase
      .from("pomodoro_sessions")
      .select("completed_at, duration_minutes, course_id, courses(name, color)")
      .eq("session_type", "focus")
      .gte("completed_at", historyStart.toISOString()),
    supabase.from("assignments").select("id, status, due_date"),
  ])

  const focusSessions: FocusSession[] = (pomodoroSessions ?? []).map((s) => ({
    completedAt: s.completed_at,
    durationMinutes: s.duration_minutes,
    courseId: s.course_id,
    courseName: s.courses?.name ?? null,
    color: s.courses?.color ?? null,
  }))

  const streak = computeStudyStreak(focusSessions)
  const dailyMinutes = dailyFocusMinutes(focusSessions, CHART_DAYS)
  const byCourse = focusMinutesByCourse(focusSessions)
  const maxCourseMinutes = Math.max(1, ...byCourse.map((c) => c.minutes))

  const totalMinutesInChart = dailyMinutes.reduce((sum, d) => sum + d.minutes, 0)

  const assignmentStats = (assignments ?? []).reduce(
    (acc, a) => {
      if (a.status === "done") acc.done++
      else if (isOverdue(a.due_date, a.status)) acc.overdue++
      else if (a.status === "in_progress") acc.inProgress++
      else acc.notStarted++
      return acc
    },
    { done: 0, inProgress: 0, notStarted: 0, overdue: 0 }
  )

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Study Analytics</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Current streak" value={`${streak.current}d`} />
        <StatTile label="Longest streak" value={`${streak.longest}d`} />
        <StatTile
          label={`Focus time (${CHART_DAYS}d)`}
          value={`${Math.round(totalMinutesInChart / 60)}h ${totalMinutesInChart % 60}m`}
        />
        <StatTile label="Assignments done" value={assignmentStats.done} />
      </div>

      <Card>
        <CardContent className="py-4">
          <StudyTimeChart days={dailyMinutes} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="grid gap-3 py-4">
            <p className="text-sm text-muted-foreground">Time by course ({HISTORY_DAYS}d)</p>
            {byCourse.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No focus sessions logged yet.
              </p>
            ) : (
              <div className="grid gap-2">
                {byCourse.map((c) => (
                  <div key={c.courseId ?? "none"} className="grid gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.courseName}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {Math.round((c.minutes / 60) * 10) / 10}h
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(c.minutes / maxCourseMinutes) * 100}%`,
                          backgroundColor: c.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-3 py-4">
            <p className="text-sm text-muted-foreground">Assignments</p>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Done" value={assignmentStats.done} />
              <StatTile label="In progress" value={assignmentStats.inProgress} />
              <StatTile label="Not started" value={assignmentStats.notStarted} />
              <StatTile label="Overdue" value={assignmentStats.overdue} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
