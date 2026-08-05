import { describe, expect, it } from "vitest"

import {
  expandAssignments,
  expandClassSessions,
  type AssignmentLike,
  type ClassSessionLike,
} from "./expand-recurrence"

const baseSession: ClassSessionLike = {
  id: "s1",
  courseId: "c1",
  title: null,
  courseName: "Intro to Algorithms",
  color: "#3b82f6",
  sessionType: "lecture",
  location: "Room 101",
  groupName: null,
  remarks: null,
  notes: null,
  isRecurring: true,
  dayOfWeek: 1, // Monday
  startTime: "10:00",
  endTime: "11:00",
  specificDates: null,
  recurrenceStartDate: "2026-09-01",
  recurrenceEndDate: "2026-12-15",
}

describe("expandClassSessions", () => {
  it("expands a weekly Mon/Wed recurring session across October into 8 events (Mon+Wed pairs)", () => {
    const mon = baseSession
    const wed: ClassSessionLike = { ...baseSession, id: "s2", dayOfWeek: 3 }

    const events = expandClassSessions(
      [mon, wed],
      new Date(2026, 9, 1), // Oct 1, 2026
      new Date(2026, 9, 31) // Oct 31, 2026
    )

    expect(events).toHaveLength(8)
    events.forEach((e) => {
      expect([1, 3]).toContain(e.start.getDay())
      expect(e.start.getHours()).toBe(10)
      expect(e.end.getHours()).toBe(11)
    })
  })

  it("clips events to the recurrence_start_date/recurrence_end_date boundaries", () => {
    const events = expandClassSessions(
      [baseSession],
      new Date(2026, 7, 1), // Aug 1 — before the series starts
      new Date(2026, 11, 31) // Dec 31
    )

    const dates = events.map((e) => e.start)
    expect(dates.every((d) => d >= new Date(2026, 8, 1))).toBe(true)
    expect(dates.every((d) => d <= new Date(2026, 11, 15, 23, 59))).toBe(true)
  })

  it("emits exactly one event for a non-recurring (exam) session on its specific date", () => {
    const exam: ClassSessionLike = {
      ...baseSession,
      id: "exam1",
      title: "Midterm Exam",
      sessionType: "exam",
      isRecurring: false,
      dayOfWeek: null,
      recurrenceStartDate: null,
      recurrenceEndDate: null,
      specificDates: ["2026-10-15"],
      startTime: "14:00",
      endTime: "16:00",
    }

    const events = expandClassSessions(
      [exam],
      new Date(2026, 9, 1),
      new Date(2026, 9, 31)
    )

    expect(events).toHaveLength(1)
    expect(events[0].title).toBe("Midterm Exam")
    expect(events[0].start.getDate()).toBe(15)
  })

  it("emits one event per date for a session with multiple specific dates", () => {
    const scattered: ClassSessionLike = {
      ...baseSession,
      id: "scattered1",
      title: "Makeup Class",
      isRecurring: false,
      dayOfWeek: null,
      recurrenceStartDate: null,
      recurrenceEndDate: null,
      specificDates: ["2026-10-03", "2026-10-10", "2026-10-24"],
    }

    const events = expandClassSessions(
      [scattered],
      new Date(2026, 9, 1),
      new Date(2026, 9, 31)
    )

    expect(events).toHaveLength(3)
    expect(
      events.map((e) => e.start.getDate()).sort((a, b) => a - b)
    ).toEqual([3, 10, 24])
  })

  it("numbers recurring weekly occurrences 1, 2, 3... from the series start", () => {
    const events = expandClassSessions(
      [baseSession],
      new Date(2026, 8, 1), // Sep 1
      new Date(2026, 8, 30) // Sep 30
    )
    const numbers = events
      .slice()
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((e) => (e.resource.type === "class" ? e.resource.lessonNumber : null))
    expect(numbers).toEqual([1, 2, 3, 4])
  })

  it("numbers dated (non-recurring) sessions chronologically per course, excluding exams", () => {
    const lesson1: ClassSessionLike = {
      ...baseSession,
      id: "d1",
      isRecurring: false,
      dayOfWeek: null,
      recurrenceStartDate: null,
      recurrenceEndDate: null,
      specificDates: ["2026-10-05"],
    }
    const lesson2: ClassSessionLike = { ...lesson1, id: "d2", specificDates: ["2026-10-12"] }
    const exam: ClassSessionLike = {
      ...lesson1,
      id: "d3",
      sessionType: "exam",
      specificDates: ["2026-10-19"],
    }

    const events = expandClassSessions(
      [lesson2, exam, lesson1], // out of order on purpose
      new Date(2026, 9, 1),
      new Date(2026, 9, 31)
    )

    const byId = new Map(events.map((e) => [e.resource.type === "class" ? e.resource.sessionId : "", e]))
    const lessonNumberOf = (id: string) => {
      const resource = byId.get(id)?.resource
      return resource?.type === "class" ? resource.lessonNumber : undefined
    }
    expect(lessonNumberOf("d1")).toBe(1)
    expect(lessonNumberOf("d2")).toBe(2)
    expect(lessonNumberOf("d3")).toBe(null)
  })

  it("numbers dated sessions per session type, so labs and lectures count independently", () => {
    const lecture1: ClassSessionLike = {
      ...baseSession,
      id: "lec1",
      sessionType: "lecture",
      isRecurring: false,
      dayOfWeek: null,
      recurrenceStartDate: null,
      recurrenceEndDate: null,
      specificDates: ["2026-10-05"],
    }
    const lab1: ClassSessionLike = {
      ...lecture1,
      id: "lab1",
      sessionType: "lab",
      specificDates: ["2026-10-06"],
    }
    const lecture2: ClassSessionLike = {
      ...lecture1,
      id: "lec2",
      specificDates: ["2026-10-12"],
    }
    const lab2: ClassSessionLike = {
      ...lab1,
      id: "lab2",
      specificDates: ["2026-10-13"],
    }

    const events = expandClassSessions(
      [lecture1, lab1, lecture2, lab2],
      new Date(2026, 9, 1),
      new Date(2026, 9, 31)
    )

    const byId = new Map(events.map((e) => [e.resource.type === "class" ? e.resource.sessionId : "", e]))
    const lessonNumberOf = (id: string) => {
      const resource = byId.get(id)?.resource
      return resource?.type === "class" ? resource.lessonNumber : undefined
    }
    expect(lessonNumberOf("lec1")).toBe(1)
    expect(lessonNumberOf("lec2")).toBe(2)
    expect(lessonNumberOf("lab1")).toBe(1)
    expect(lessonNumberOf("lab2")).toBe(2)
  })

  it("excludes a one-off session whose specific_date falls outside the visible range", () => {
    const exam: ClassSessionLike = {
      ...baseSession,
      id: "exam1",
      isRecurring: false,
      dayOfWeek: null,
      recurrenceStartDate: null,
      recurrenceEndDate: null,
      specificDates: ["2026-11-15"],
    }

    const events = expandClassSessions(
      [exam],
      new Date(2026, 9, 1),
      new Date(2026, 9, 31)
    )

    expect(events).toHaveLength(0)
  })
})

describe("expandAssignments", () => {
  const assignment: AssignmentLike = {
    id: "a1",
    courseId: "c1",
    title: "Problem Set 3",
    courseName: "Intro to Algorithms",
    color: "#3b82f6",
    dueDate: "2026-10-20T23:59:00.000Z",
    status: "not_started",
    priority: null,
    description: null,
  }

  it("includes an assignment due within the visible range", () => {
    const events = expandAssignments(
      [assignment],
      new Date(2026, 9, 1),
      new Date(2026, 9, 31)
    )
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe("Due: Problem Set 3")
  })

  it("excludes an assignment due outside the visible range", () => {
    const events = expandAssignments(
      [assignment],
      new Date(2026, 10, 1),
      new Date(2026, 10, 30)
    )
    expect(events).toHaveLength(0)
  })
})
