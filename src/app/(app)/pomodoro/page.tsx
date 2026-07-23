import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"

import { PomodoroTimer } from "./pomodoro-timer"

export default async function PomodoroPage() {
  const supabase = await createClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [{ data: courses }, { data: todaySessions }] = await Promise.all([
    supabase.from("courses").select("id, name, color").eq("archived", false).order("name"),
    supabase
      .from("pomodoro_sessions")
      .select("id, duration_minutes, completed_at, courses(name, color)")
      .eq("session_type", "focus")
      .gte("completed_at", todayStart.toISOString())
      .order("completed_at", { ascending: false }),
  ])

  const totalMinutesToday = (todaySessions ?? []).reduce((sum, s) => sum + s.duration_minutes, 0)

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Pomodoro Timer</h1>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardContent className="pt-6">
            <PomodoroTimer courses={courses ?? []} />
          </CardContent>
        </Card>

        <div className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Today · {todaySessions?.length ?? 0} session{todaySessions?.length === 1 ? "" : "s"} ·{" "}
            {totalMinutesToday} min focused
          </h2>
          {!todaySessions?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No focus sessions completed yet today.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {todaySessions.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-1.5">
                      {s.courses && (
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: s.courses.color ?? "#3b82f6" }}
                        />
                      )}
                      <span className="text-sm">{s.courses?.name ?? "No course"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{s.duration_minutes} min</span>
                      <span>
                        {new Date(s.completed_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
