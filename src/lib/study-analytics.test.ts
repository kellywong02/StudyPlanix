import { describe, expect, it } from "vitest"

import {
  computeStudyStreak,
  dailyFocusMinutes,
  focusMinutesByCourse,
  type FocusSession,
} from "./study-analytics"

function session(dateStr: string, minutes: number, courseId: string | null = null): FocusSession {
  return {
    completedAt: `${dateStr}T12:00:00.000Z`,
    durationMinutes: minutes,
    courseId,
    courseName: courseId ? `Course ${courseId}` : null,
    color: courseId ? "#3b82f6" : null,
  }
}

describe("dailyFocusMinutes", () => {
  it("zero-fills days with no sessions", () => {
    const now = new Date("2026-07-24T00:00:00.000Z")
    const sessions = [session("2026-07-24", 25)]
    const days = dailyFocusMinutes(sessions, 3, now)
    expect(days).toEqual([
      { date: "2026-07-22", minutes: 0 },
      { date: "2026-07-23", minutes: 0 },
      { date: "2026-07-24", minutes: 25 },
    ])
  })

  it("sums multiple sessions on the same day", () => {
    const now = new Date("2026-07-24T00:00:00.000Z")
    const sessions = [session("2026-07-24", 25), session("2026-07-24", 15)]
    const days = dailyFocusMinutes(sessions, 1, now)
    expect(days).toEqual([{ date: "2026-07-24", minutes: 40 }])
  })
})

describe("focusMinutesByCourse", () => {
  it("groups and sums minutes per course, sorted descending", () => {
    const sessions = [
      session("2026-07-24", 25, "course-a"),
      session("2026-07-24", 50, "course-b"),
      session("2026-07-23", 10, "course-a"),
      session("2026-07-23", 5, null),
    ]
    const result = focusMinutesByCourse(sessions)
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ courseId: "course-b", minutes: 50 })
    expect(result[1]).toMatchObject({ courseId: "course-a", minutes: 35 })
    expect(result[2]).toMatchObject({ courseId: null, courseName: "No course", minutes: 5 })
  })
})

describe("computeStudyStreak", () => {
  it("returns zero for no sessions", () => {
    expect(computeStudyStreak([])).toEqual({ current: 0, longest: 0 })
  })

  it("counts a current streak that includes today", () => {
    const now = new Date("2026-07-24T15:00:00.000Z")
    const sessions = [session("2026-07-22", 10), session("2026-07-23", 10), session("2026-07-24", 10)]
    const streak = computeStudyStreak(sessions, now)
    expect(streak.current).toBe(3)
    expect(streak.longest).toBe(3)
  })

  it("does not zero the streak just because today hasn't happened yet", () => {
    // studied yesterday and the day before, nothing logged yet today
    const now = new Date("2026-07-24T08:00:00.000Z")
    const sessions = [session("2026-07-22", 10), session("2026-07-23", 10)]
    const streak = computeStudyStreak(sessions, now)
    expect(streak.current).toBe(2)
  })

  it("breaks the current streak on a missed day", () => {
    const now = new Date("2026-07-24T15:00:00.000Z")
    // gap on the 23rd
    const sessions = [session("2026-07-20", 10), session("2026-07-21", 10), session("2026-07-24", 10)]
    const streak = computeStudyStreak(sessions, now)
    expect(streak.current).toBe(1) // only today
    expect(streak.longest).toBe(2) // the 20th-21st run
  })

  it("current streak is zero if the last session was more than a day ago", () => {
    const now = new Date("2026-07-24T15:00:00.000Z")
    const sessions = [session("2026-07-20", 10), session("2026-07-21", 10)]
    const streak = computeStudyStreak(sessions, now)
    expect(streak.current).toBe(0)
    expect(streak.longest).toBe(2)
  })

  it("multiple sessions on the same day only count once toward the streak", () => {
    const now = new Date("2026-07-24T15:00:00.000Z")
    const sessions = [session("2026-07-24", 10), session("2026-07-24", 15), session("2026-07-24", 5)]
    const streak = computeStudyStreak(sessions, now)
    expect(streak.current).toBe(1)
    expect(streak.longest).toBe(1)
  })
})
