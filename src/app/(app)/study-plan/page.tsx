import { createClient } from "@/lib/supabase/server"
import { STUDY_TYPE_LABELS } from "@/lib/validators/study-plan"
import { Card, CardContent } from "@/components/ui/card"

import { GeneratePlanButton } from "./generate-plan-button"
import { SessionStatusButton } from "./session-status-button"

function formatTime(time: string) {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${m} ${period}`
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

export default async function StudyPlanPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("study_type")
    .eq("id", user!.id)
    .single()

  const today = new Date().toISOString().slice(0, 10)
  const { data: sessions } = await supabase
    .from("study_plan_sessions")
    .select("*, courses(name, color), assignments(title)")
    .gte("session_date", today)
    .neq("status", "skipped")
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true })

  const byDate = new Map<string, NonNullable<typeof sessions>>()
  for (const s of sessions ?? []) {
    const list = byDate.get(s.session_date) ?? []
    list.push(s)
    byDate.set(s.session_date, list)
  }

  const studyType = profile?.study_type ?? "full_time"

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Study plan</h1>
          <p className="text-sm text-muted-foreground">
            Planned as a{" "}
            {STUDY_TYPE_LABELS[studyType as keyof typeof STUDY_TYPE_LABELS] ?? "student"}.{" "}
            <a href="/settings" className="underline underline-offset-4">
              Update in settings
            </a>
            .
          </p>
        </div>
        <GeneratePlanButton hasExistingPlan={(sessions?.length ?? 0) > 0} />
      </div>

      {!sessions?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No study sessions planned yet. Add some assignments or exams, then generate a plan.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {Array.from(byDate.entries()).map(([date, daySessions]) => (
            <div key={date} className="grid gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">{formatDate(date)}</h2>
              <div className="grid gap-2">
                {daySessions.map((s) => (
                  <Card key={s.id} className={s.status === "done" ? "opacity-60" : undefined}>
                    <CardContent className="flex items-center justify-between gap-4">
                      <div className="grid gap-1">
                        <div className="flex items-center gap-1.5">
                          {s.courses && (
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: s.courses.color ?? "#3b82f6" }}
                            />
                          )}
                          <span className="text-sm font-medium">{s.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(s.start_time)} – {formatTime(s.end_time)}
                          {s.courses?.name ? ` · ${s.courses.name}` : ""}
                          {s.assignments?.title ? ` · ${s.assignments.title}` : ""}
                        </p>
                        {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                      </div>
                      <SessionStatusButton sessionId={s.id} status={s.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
