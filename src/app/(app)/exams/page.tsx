import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"

function formatTime(time: string) {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${m} ${period}`
}

export default async function ExamsPage() {
  const supabase = await createClient()
  const { data: exams } = await supabase
    .from("class_sessions")
    .select("*, courses(name, color, code)")
    .eq("session_type", "exam")

  const today = new Date().toISOString().slice(0, 10)
  const sorted = (exams ?? [])
    .slice()
    .sort((a, b) => (a.specific_dates?.[0] ?? "").localeCompare(b.specific_dates?.[0] ?? ""))
  const upcoming = sorted.filter(
    (e) => !e.specific_dates || e.specific_dates.some((d) => d >= today)
  )
  const past = sorted.filter(
    (e) => e.specific_dates && e.specific_dates.every((d) => d < today)
  )

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Exams</h1>

      {!exams?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No exams scheduled yet. Add one from the Timetable page and set its type to
            &quot;Exam&quot;.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <Card key={e.id}>
                <CardContent className="grid gap-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: e.courses?.color ?? "#3b82f6" }}
                    />
                    <span className="text-sm font-medium">{e.title || e.courses?.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {e.specific_dates?.join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(e.start_time)} – {formatTime(e.end_time)}
                  </p>
                  {e.location && <p className="text-xs text-muted-foreground">{e.location}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {past.length > 0 && (
            <div className="grid gap-3">
              <h2 className="text-lg font-medium text-muted-foreground">Past exams</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((e) => (
                  <Card key={e.id} className="opacity-60">
                    <CardContent className="grid gap-1">
                      <span className="text-sm font-medium">{e.title || e.courses?.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {e.specific_dates?.join(", ")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
