import ICAL from "ical.js"

import type { ParsedSessionRow, ParseResult } from "./types"

const BYDAY_TO_NUMBER: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

const FALLBACK_RECURRENCE_WEEKS = 16

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function formatDate(t: ICAL.Time) {
  return `${t.year}-${pad(t.month)}-${pad(t.day)}`
}

function formatTime(t: ICAL.Time) {
  return `${pad(t.hour)}:${pad(t.minute)}`
}

function addWeeks(t: ICAL.Time, weeks: number): ICAL.Time {
  const clone = t.clone()
  clone.addDuration(ICAL.Duration.fromString(`P${weeks}W`))
  return clone
}

export function parseIcs(icsText: string): ParseResult {
  const errors: string[] = []
  const rows: ParsedSessionRow[] = []

  let comp: ICAL.Component
  try {
    const jcalData = ICAL.parse(icsText)
    comp = new ICAL.Component(jcalData)
  } catch {
    return { rows: [], errors: ["Could not parse this file as a valid .ics calendar."] }
  }

  const vevents = comp.getAllSubcomponents("vevent")
  if (vevents.length === 0) {
    return { rows: [], errors: ["No events found in this calendar file."] }
  }

  vevents.forEach((vevent, index) => {
    try {
      const event = new ICAL.Event(vevent)
      const uid = event.uid || `ics-${index}`
      const title = event.summary || null
      const location = event.location || null
      const remarks = event.description || null
      const startTime = formatTime(event.startDate)
      const endTime = formatTime(event.endDate)

      const rrule = vevent.getFirstPropertyValue("rrule") as ICAL.Recur | null
      const isWeeklyRecurring = !!rrule && rrule.freq === "WEEKLY"

      if (isWeeklyRecurring) {
        const byday: string[] =
          (rrule.parts?.BYDAY as string[] | undefined) ??
          [Object.keys(BYDAY_TO_NUMBER)[event.startDate.dayOfWeek() - 1] ?? "MO"]

        const recurrenceStartDate = formatDate(event.startDate)
        const recurrenceEndDate = rrule.until
          ? formatDate(rrule.until)
          : formatDate(addWeeks(event.startDate, FALLBACK_RECURRENCE_WEEKS))

        for (const day of byday) {
          const dayOfWeek = BYDAY_TO_NUMBER[day.toUpperCase()]
          if (dayOfWeek === undefined) continue

          rows.push({
            rowId: `ics-${index}-${day}`,
            source: "ics",
            courseCode: "",
            courseName: title || "Imported class",
            sessionType: "lecture",
            location,
            isRecurring: true,
            dayOfWeek,
            startTime,
            endTime,
            specificDate: null,
            recurrenceStartDate,
            recurrenceEndDate,
            externalUid: `${uid}-${day}`,
            title,
            remarks,
            groupName: null,
          })
        }
      } else {
        rows.push({
          rowId: `ics-${index}`,
          source: "ics",
          courseCode: "",
          courseName: title || "Imported event",
          sessionType: /exam/i.test(title ?? "") ? "exam" : "other",
          location,
          isRecurring: false,
          dayOfWeek: null,
          startTime,
          endTime,
          specificDate: formatDate(event.startDate),
          recurrenceStartDate: null,
          recurrenceEndDate: null,
          externalUid: uid,
          title,
          remarks,
          groupName: null,
        })
      }
    } catch {
      errors.push(`Could not parse event ${index + 1} in the calendar file.`)
    }
  })

  return { rows, errors }
}
