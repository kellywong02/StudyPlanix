export type FocusSession = {
  completedAt: string
  durationMinutes: number
  courseId: string | null
  courseName: string | null
  color: string | null
}

export type DailyMinutes = { date: string; minutes: number }

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

/** last `days` calendar days ending today (local server date), zero-filled */
export function dailyFocusMinutes(
  sessions: FocusSession[],
  days: number,
  now = new Date()
): DailyMinutes[] {
  const minutesByDate = new Map<string, number>()
  for (const s of sessions) {
    const key = s.completedAt.slice(0, 10)
    minutesByDate.set(key, (minutesByDate.get(key) ?? 0) + s.durationMinutes)
  }

  const result: DailyMinutes[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = toDateKey(d)
    result.push({ date: key, minutes: minutesByDate.get(key) ?? 0 })
  }
  return result
}

export type CourseMinutes = {
  courseId: string | null
  courseName: string
  color: string
  minutes: number
}

export function focusMinutesByCourse(sessions: FocusSession[]): CourseMinutes[] {
  const byCourse = new Map<string, CourseMinutes>()
  for (const s of sessions) {
    const key = s.courseId ?? "none"
    const entry = byCourse.get(key) ?? {
      courseId: s.courseId,
      courseName: s.courseName ?? "No course",
      color: s.color ?? "#a1a1aa",
      minutes: 0,
    }
    entry.minutes += s.durationMinutes
    byCourse.set(key, entry)
  }
  return Array.from(byCourse.values()).sort((a, b) => b.minutes - a.minutes)
}

export type StudyStreak = { current: number; longest: number }

/** consecutive-day streak of having at least one completed focus session */
export function computeStudyStreak(sessions: FocusSession[], now = new Date()): StudyStreak {
  const studyDates = new Set(sessions.map((s) => s.completedAt.slice(0, 10)))
  if (studyDates.size === 0) return { current: 0, longest: 0 }

  // current streak: walk backward from today. If today has no session yet,
  // that alone shouldn't zero out a streak still in progress — start from
  // yesterday instead, but only if today is genuinely empty.
  const cursor = new Date(now)
  if (!studyDates.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  let current = 0
  while (studyDates.has(toDateKey(cursor))) {
    current++
    cursor.setDate(cursor.getDate() - 1)
  }

  // longest streak: scan all distinct dates in order for the longest
  // consecutive run
  const sortedDates = Array.from(studyDates).sort()
  let longest = 1
  let run = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1])
    const curr = new Date(sortedDates[i])
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000))
    run = diffDays === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  }

  return { current, longest }
}
