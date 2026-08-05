import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { DAYS_OF_WEEK } from "@/lib/validators/class-sessions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { SessionDialog } from "./session-dialog"
import { DeleteSessionButton } from "./delete-session-button"
import { SessionNotesEditor } from "./session-notes-editor"
import { ClassSessionList } from "./class-session-list"

function formatTime(time: string) {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${m} ${period}`
}

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; edit?: string }>
}) {
  const { course: courseFilter, edit: editSessionId } = await searchParams
  const supabase = await createClient()

  const [{ data: courses }, { data: sessions }] = await Promise.all([
    supabase
      .from("courses")
      .select("*, course_groups(*)")
      .eq("archived", false)
      .order("name"),
    supabase
      .from("class_sessions")
      .select("*, courses(name, color, code), course_groups(name)")
      .order("start_time"),
  ])

  if (!courses?.length) {
    return (
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Timetable</h1>
          <Button asChild variant="outline">
            <Link href="/timetable/import">Import</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You need a course before you can add class sessions manually — or{" "}
            <Link href="/timetable/import" className="underline underline-offset-4">
              import your timetable
            </Link>{" "}
            from an Excel/.csv file or .ics calendar to create courses automatically.
          </CardContent>
        </Card>
      </div>
    )
  }

  const recurring = (sessions ?? []).filter((s) => s.is_recurring)
  const dated = (sessions ?? [])
    .filter((s) => !s.is_recurring)
    .sort((a, b) => (a.specific_dates?.[0] ?? "").localeCompare(b.specific_dates?.[0] ?? ""))
  const datedClasses = dated.filter((s) => s.session_type !== "exam")
  const exams = dated.filter((s) => s.session_type === "exam")

  // notes written on a class carry forward to the next occurrence of that
  // course and session type, so a reminder like "bring lab report" shows up
  // on the upcoming lab instead of getting buried on the class it was
  // written on. Each class's position in that same chronological order
  // (per type — "Lab 1, Lab 2..." and "Lecture 1, Lecture 2..." count
  // independently) is its lesson number.
  const previousLessonNotes = new Map<string, string>()
  const lessonNumbers = new Map<string, number>()
  const classesByCourse = new Map<string, typeof datedClasses>()
  for (const s of datedClasses) {
    const key = `${s.course_id}::${s.session_type}`
    const list = classesByCourse.get(key) ?? []
    list.push(s)
    classesByCourse.set(key, list)
  }
  for (const list of classesByCourse.values()) {
    const sorted = [...list].sort((a, b) =>
      (a.specific_dates?.[0] ?? "").localeCompare(b.specific_dates?.[0] ?? "")
    )
    sorted.forEach((s, i) => lessonNumbers.set(s.id, i + 1))
    for (let i = 1; i < sorted.length; i++) {
      const prevNotes = sorted[i - 1].notes
      if (prevNotes) previousLessonNotes.set(sorted[i].id, prevNotes)
    }
  }

  const visibleRecurring = courseFilter
    ? recurring.filter((s) => s.course_id === courseFilter)
    : recurring
  const visibleDatedClasses = courseFilter
    ? datedClasses.filter((s) => s.course_id === courseFilter)
    : datedClasses
  const visibleExams = courseFilter ? exams.filter((s) => s.course_id === courseFilter) : exams

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Timetable</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/timetable/import">Import</Link>
          </Button>
          <SessionDialog courses={courses} trigger={<Button>New session</Button>} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/timetable">
          <Button variant={!courseFilter ? "secondary" : "outline"} size="sm">
            All
          </Button>
        </Link>
        {courses.map((c) => (
          <Link key={c.id} href={`/timetable?course=${c.id}`}>
            <Button variant={courseFilter === c.id ? "secondary" : "outline"} size="sm">
              {c.name}
            </Button>
          </Link>
        ))}
      </div>

      {visibleRecurring.length > 0 && (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {DAYS_OF_WEEK.map((day) => {
          const daySessions = visibleRecurring
            .filter((s) => s.day_of_week === day.value)
            .sort((a, b) => a.start_time.localeCompare(b.start_time))

          return (
            <div key={day.value} className="grid gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">{day.label}</h2>
              <div className="grid gap-2">
                {daySessions.length === 0 && (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
                {daySessions.map((s) => (
                  <Card key={s.id} className="gap-2 py-3">
                    <CardContent className="grid gap-1 px-3">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: s.courses?.color ?? "#3b82f6" }}
                          />
                          <span className="text-sm font-medium">
                            {s.title || s.courses?.name}
                          </span>
                        </div>
                        <DeleteSessionButton sessionId={s.id} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(s.start_time)} – {formatTime(s.end_time)}
                      </p>
                      {s.location && (
                        <p className="text-xs text-muted-foreground">{s.location}</p>
                      )}
                      {s.course_groups?.name && (
                        <p className="text-xs text-muted-foreground">
                          Group: {s.course_groups.name}
                        </p>
                      )}
                      {s.remarks && (
                        <p className="text-xs text-muted-foreground italic">{s.remarks}</p>
                      )}
                      <SessionNotesEditor sessionId={s.id} initialNotes={s.notes ?? ""} />
                      <div className="mt-1 flex gap-2">
                        <SessionDialog
                          courses={courses}
                          session={s}
                          defaultOpen={s.id === editSessionId}
                          trigger={
                            <Button variant="outline" size="xs" className="w-fit">
                              Edit
                            </Button>
                          }
                        />
                        <Button asChild variant="outline" size="xs" className="w-fit">
                          <Link href={`/assignments?course=${s.course_id}&new=1`}>
                            + Assignment
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      )}

      <ClassSessionList
        heading="Classes"
        sessions={visibleDatedClasses}
        courses={courses}
        previousLessonNotes={Object.fromEntries(previousLessonNotes)}
        lessonNumbers={Object.fromEntries(lessonNumbers)}
        autoOpenSessionId={editSessionId}
      />

      <ClassSessionList
        heading="Exams"
        sessions={visibleExams}
        courses={courses}
        autoOpenSessionId={editSessionId}
      />
    </div>
  )
}
