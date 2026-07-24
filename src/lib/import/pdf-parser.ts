import "server-only"
import { zodResponseFormat } from "openai/helpers/zod"

import { getOpenAIClient } from "@/lib/ai/openai"
import { pdfExtractionSchema } from "@/lib/validators/pdf-import"

import type { ParsedSessionRow, ParseResult } from "./types"

const TIME_RE = /^\d{2}:\d{2}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// PDF text (raw or with light markup) can run long; cap what we send so a
// dense multi-page syllabus doesn't blow past context/cost budgets — a
// timetable/schedule table is virtually always near the front of the document
const MAX_INPUT_CHARS = 15000

const SYSTEM_PROMPT = `You extract a university class timetable from raw text pulled from a syllabus, \
timetable, or course schedule PDF. The text may be messy (extracted from a table or multi-column layout).

Only extract class sessions, tutorials, labs, and exams — not assignments or homework due dates.

For each class meeting you find:
- If it repeats weekly on the same day/time across the term (e.g. "Lectures: Monday 10:00-12:00, Weeks 1-13" \
or "every Tuesday"), set isRecurring=true, dayOfWeek (0=Sunday..6=Saturday), and recurrenceStartDate/\
recurrenceEndDate covering the term (infer reasonable dates from any term/semester dates mentioned; if \
truly no dates are given anywhere in the document, use null and it will be flagged for the user to fix).
- If it's a one-off date (a specific exam date, a single guest lecture, a make-up class), set \
isRecurring=false, dayOfWeek=null, and specificDate to that exact date.
- Times must be 24-hour "HH:MM". Dates must be "YYYY-MM-DD".
- courseCode is the short course identifier (e.g. "CS101") if present, else null.
- Leave a field null rather than guessing when the document genuinely doesn't say.

If the text doesn't look like it contains a timetable at all, return an empty sessions array.`

export async function parsePdfTimetable(pdfText: string): Promise<ParseResult> {
  const client = getOpenAIClient()

  const completion = await client.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: pdfText.slice(0, MAX_INPUT_CHARS) },
    ],
    response_format: zodResponseFormat(pdfExtractionSchema, "timetable_extraction"),
  })

  const parsed = completion.choices[0]?.message.parsed
  if (!parsed) {
    return {
      rows: [],
      errors: [
        "The AI could not read a timetable from this PDF. Try a clearer file, or enter your classes manually.",
      ],
    }
  }

  const rows: ParsedSessionRow[] = []
  const errors: string[] = []

  parsed.sessions.forEach((s, index) => {
    const rowErrors: string[] = []
    const courseName = s.courseName.trim() || s.courseCode?.trim() || ""
    if (!courseName) rowErrors.push("missing course name")
    if (!TIME_RE.test(s.startTime)) rowErrors.push("invalid start time")
    if (!TIME_RE.test(s.endTime)) rowErrors.push("invalid end time")

    if (s.isRecurring) {
      if (s.dayOfWeek === null) rowErrors.push("missing day of week for a recurring class")
      if (!s.recurrenceStartDate || !DATE_RE.test(s.recurrenceStartDate)) {
        rowErrors.push("missing or invalid recurrence start date")
      }
      if (!s.recurrenceEndDate || !DATE_RE.test(s.recurrenceEndDate)) {
        rowErrors.push("missing or invalid recurrence end date")
      }
    } else if (!s.specificDate || !DATE_RE.test(s.specificDate)) {
      rowErrors.push("missing or invalid date")
    }

    if (rowErrors.length > 0) {
      errors.push(`"${courseName || "Unnamed session"}": ${rowErrors.join(", ")}`)
    }

    rows.push({
      rowId: `pdf-${index}`,
      source: "pdf",
      courseCode: s.courseCode?.trim() ?? "",
      courseName: courseName || "Imported class",
      sessionType: s.sessionType,
      location: s.location?.trim() || null,
      isRecurring: s.isRecurring,
      dayOfWeek: s.isRecurring ? s.dayOfWeek : null,
      startTime: TIME_RE.test(s.startTime) ? s.startTime : "09:00",
      endTime: TIME_RE.test(s.endTime) ? s.endTime : "10:00",
      specificDate: !s.isRecurring && s.specificDate && DATE_RE.test(s.specificDate) ? s.specificDate : null,
      recurrenceStartDate:
        s.isRecurring && s.recurrenceStartDate && DATE_RE.test(s.recurrenceStartDate)
          ? s.recurrenceStartDate
          : null,
      recurrenceEndDate:
        s.isRecurring && s.recurrenceEndDate && DATE_RE.test(s.recurrenceEndDate)
          ? s.recurrenceEndDate
          : null,
      externalUid: null,
      title: null,
      remarks: s.remarks?.trim() || null,
      groupName: s.groupName?.trim() || null,
      error: rowErrors.length > 0 ? rowErrors.join(", ") : undefined,
    })
  })

  return { rows, errors }
}
