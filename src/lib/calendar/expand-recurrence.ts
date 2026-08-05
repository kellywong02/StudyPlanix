import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  getDay,
  isWithinInterval,
  max,
  min,
  parseISO,
  startOfDay,
} from "date-fns"

export interface ClassSessionLike {
  id: string
  courseId: string
  title: string | null
  courseName: string
  color: string
  sessionType: string
  location: string | null
  groupName: string | null
  remarks: string | null
  notes: string | null
  isRecurring: boolean
  dayOfWeek: number | null
  startTime: string
  endTime: string
  specificDates: string[] | null
  recurrenceStartDate: string | null
  recurrenceEndDate: string | null
}

export interface AssignmentLike {
  id: string
  courseId: string
  title: string
  courseName: string
  color: string
  dueDate: string
  status: string
  priority: string | null
  description: string | null
}

export type CalendarEventResource =
  | {
      type: "class"
      sessionId: string
      color: string
      sessionType: string
      location: string | null
      courseId: string
      courseName: string
      groupName: string | null
      remarks: string | null
      notes: string | null
      lessonNumber: number | null
    }
  | {
      type: "assignment"
      assignmentId: string
      color: string
      status: string
      courseId: string
      courseName: string
      priority: string | null
      description: string | null
    }

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: CalendarEventResource
}

function applyTime(day: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number)
  const d = new Date(day)
  d.setHours(h, m, 0, 0)
  return d
}

// each course's dated (non-recurring), non-exam sessions get numbered in
// chronological order per session type (so "Lab 1, Lab 2..." and
// "Lecture 1, Lecture 2..." count independently) — the same numbering shown
// on the timetable and dashboard pages, kept in sync here so the calendar
// matches.
function computeDatedLessonNumbers(sessions: ClassSessionLike[]): Map<string, number> {
  const byCourseAndType = new Map<string, ClassSessionLike[]>()
  for (const s of sessions) {
    if (s.isRecurring || s.sessionType === "exam") continue
    const key = `${s.courseId}::${s.sessionType}`
    const list = byCourseAndType.get(key) ?? []
    list.push(s)
    byCourseAndType.set(key, list)
  }

  const lessonNumbers = new Map<string, number>()
  for (const list of byCourseAndType.values()) {
    const sorted = [...list].sort((a, b) =>
      (a.specificDates?.[0] ?? "").localeCompare(b.specificDates?.[0] ?? "")
    )
    sorted.forEach((s, i) => lessonNumbers.set(s.id, i + 1))
  }
  return lessonNumbers
}

// which occurrence (1st, 2nd, 3rd week...) of a weekly recurring series a
// given date falls on, counting from the series' start date.
function recurringLessonNumber(day: Date, seriesStart: Date, dayOfWeek: number): number {
  const dayOffset = (dayOfWeek - getDay(seriesStart) + 7) % 7
  const firstOccurrence = addDays(seriesStart, dayOffset)
  return Math.floor(differenceInCalendarDays(day, firstOccurrence) / 7) + 1
}

export function expandClassSessions(
  sessions: ClassSessionLike[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const normalizedRangeStart = startOfDay(rangeStart)
  const normalizedRangeEnd = endOfDay(rangeEnd)
  const datedLessonNumbers = computeDatedLessonNumbers(sessions)

  for (const session of sessions) {
    const title = session.title || session.courseName
    const baseResource: CalendarEventResource = {
      type: "class",
      sessionId: session.id,
      color: session.color,
      sessionType: session.sessionType,
      location: session.location,
      courseId: session.courseId,
      courseName: session.courseName,
      groupName: session.groupName,
      remarks: session.remarks,
      notes: session.notes,
      lessonNumber: datedLessonNumbers.get(session.id) ?? null,
    }

    if (session.isRecurring) {
      if (!session.recurrenceStartDate || !session.recurrenceEndDate) continue

      const seriesStart = startOfDay(parseISO(session.recurrenceStartDate))
      const seriesEnd = endOfDay(parseISO(session.recurrenceEndDate))

      const windowStart = max([seriesStart, normalizedRangeStart])
      const windowEnd = min([seriesEnd, normalizedRangeEnd])

      if (windowStart > windowEnd) continue

      for (const day of eachDayOfInterval({ start: windowStart, end: windowEnd })) {
        if (getDay(day) !== session.dayOfWeek) continue
        events.push({
          id: `${session.id}-${day.toISOString().slice(0, 10)}`,
          title,
          start: applyTime(day, session.startTime),
          end: applyTime(day, session.endTime),
          resource: {
            ...baseResource,
            lessonNumber: recurringLessonNumber(day, seriesStart, session.dayOfWeek!),
          },
        })
      }
    } else {
      if (!session.specificDates) continue
      for (const specificDate of session.specificDates) {
        const date = parseISO(specificDate)
        if (
          !isWithinInterval(date, {
            start: normalizedRangeStart,
            end: normalizedRangeEnd,
          })
        ) {
          continue
        }
        events.push({
          id: `${session.id}-${specificDate}`,
          title,
          start: applyTime(date, session.startTime),
          end: applyTime(date, session.endTime),
          resource: baseResource,
        })
      }
    }
  }

  return events
}

export function expandAssignments(
  assignments: AssignmentLike[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const normalizedRangeStart = startOfDay(rangeStart)
  const normalizedRangeEnd = endOfDay(rangeEnd)

  return assignments
    .filter((a) =>
      isWithinInterval(parseISO(a.dueDate), {
        start: normalizedRangeStart,
        end: normalizedRangeEnd,
      })
    )
    .map((a) => {
      const due = parseISO(a.dueDate)
      return {
        id: a.id,
        title: `Due: ${a.title}`,
        start: due,
        end: due,
        resource: {
          type: "assignment",
          assignmentId: a.id,
          color: a.color,
          status: a.status,
          courseId: a.courseId,
          courseName: a.courseName,
          priority: a.priority,
          description: a.description,
        },
      }
    })
}
