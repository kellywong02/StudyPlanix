import * as XLSX from "xlsx"

import type { ParsedSessionRow, ParseResult } from "./types"

const SESSION_TYPES = ["lecture", "lab", "tutorial", "seminar", "exam", "other"] as const

function normalizeTime(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null

  if (value instanceof Date) {
    // round to the nearest minute rather than reading hours/minutes directly —
    // Excel's floating-point day-serial can leave a few seconds of drift after
    // SheetJS converts it to a Date, which would otherwise surface as an
    // off-by-a-few-minutes time (e.g. 12:00 imported as 12:04)
    const msSinceMidnight =
      value.getUTCHours() * 3600000 +
      value.getUTCMinutes() * 60000 +
      value.getUTCSeconds() * 1000 +
      value.getUTCMilliseconds()
    const totalMinutes = Math.round(msSinceMidnight / 60000) % 1440
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }

  if (typeof value === "number") {
    // Excel time serial: fraction of a 24h day. Only the fractional part
    // matters here (a serial can carry a whole-day component too if the
    // source cell mixes date + time), so drop the integer part first.
    const fractionOfDay = value - Math.floor(value)
    const totalMinutes = Math.round(fractionOfDay * 24 * 60) % 1440
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }

  const str = String(value).trim()
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10) % 12
    if (ampmMatch[3].toLowerCase() === "pm") h += 12
    return `${String(h).padStart(2, "0")}:${ampmMatch[2]}`
  }
  const plainMatch = str.match(/^(\d{1,2}):(\d{2})/)
  if (plainMatch) {
    return `${plainMatch[1].padStart(2, "0")}:${plainMatch[2]}`
  }
  return null
}

const MS_PER_DAY = 86400000
// Excel's day-0 reference point (1899-12-30); anchoring the conversion here,
// entirely in UTC epoch-millisecond arithmetic, matches Excel's serial dates
// for the modern era without ever constructing a JS Date via the local
// multi-arg constructor — that path is what introduces timezone drift (see
// normalizeTime), since environments whose zone had a historical (pre-1900s)
// UTC offset different from today's compute the wrong wall-clock time.
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)

function excelSerialToUTCDate(serial: number): Date {
  return new Date(EXCEL_EPOCH_MS + Math.round(serial * MS_PER_DAY))
}

function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null

  if (value instanceof Date) {
    const y = value.getUTCFullYear()
    const m = value.getUTCMonth() + 1
    const d = value.getUTCDate()
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
  }

  if (typeof value === "number") {
    const d = excelSerialToUTCDate(Math.floor(value))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate()
    ).padStart(2, "0")}`
  }

  const str = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, mm, dd, yyyy] = slashMatch
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
  }

  return null
}

function getField(row: Record<string, unknown>, ...names: string[]): unknown {
  const keys = Object.keys(row)
  for (const name of names) {
    const key = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase())
    if (key !== undefined) return row[key]
  }
  return undefined
}

export function parseXlsx(buffer: ArrayBuffer): ParseResult {
  // Deliberately NOT using `cellDates` — SheetJS's Date-object conversion for
  // date/time cells round-trips through local-timezone Date arithmetic
  // internally, which is wrong for any 1899/1900-epoch value on a machine
  // whose zone had a different historical UTC offset than it does today
  // (e.g. Asia/Singapore was UTC+6:55:25 pre-1933, not the modern +8:00).
  // Reading raw numeric serials and converting them ourselves with pure
  // epoch-millisecond arithmetic (see normalizeDate/normalizeTime) sidesteps
  // that entirely.
  const workbook = XLSX.read(buffer, { type: "array" })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return { rows: [], errors: ["The file has no sheets."] }
  }

  const sheet = workbook.Sheets[firstSheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  })

  const rows: ParsedSessionRow[] = []
  const errors: string[] = []

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2 // +1 for header row, +1 for 1-based
    const courseCode = String(getField(raw, "Course Code") ?? "").trim()
    const courseName = String(getField(raw, "Course Name") ?? "").trim()

    if (!courseCode && !courseName) {
      return // skip fully blank rows
    }

    const startTime = normalizeTime(getField(raw, "Start Time"))
    const endTime = normalizeTime(getField(raw, "End Time"))
    const location = String(getField(raw, "Location") ?? "").trim() || null
    const remarks = String(getField(raw, "Remarks") ?? "").trim() || null
    const groupName = String(getField(raw, "Group") ?? "").trim() || null
    const sessionTypeRaw = String(getField(raw, "Session Type") ?? "lecture")
      .trim()
      .toLowerCase()
    const sessionType = (SESSION_TYPES as readonly string[]).includes(sessionTypeRaw)
      ? (sessionTypeRaw as ParsedSessionRow["sessionType"])
      : "lecture"

    // every class is entered against a specific date — including classes
    // that meet weekly, since the date/day can shift week to week
    const specificDate = normalizeDate(getField(raw, "Date"))

    const rowErrors: string[] = []
    if (!courseName) rowErrors.push("missing Course Name")
    if (!startTime) rowErrors.push("invalid or missing Start Time")
    if (!endTime) rowErrors.push("invalid or missing End Time")
    if (!specificDate) rowErrors.push("invalid or missing Date")

    if (rowErrors.length > 0) {
      errors.push(`Row ${rowNumber}: ${rowErrors.join(", ")}`)
    }

    rows.push({
      rowId: `xlsx-${index}`,
      courseCode,
      courseName: courseName || courseCode,
      sessionType,
      location,
      isRecurring: false,
      dayOfWeek: null,
      startTime: startTime ?? "09:00",
      endTime: endTime ?? "10:00",
      specificDate,
      recurrenceStartDate: null,
      recurrenceEndDate: null,
      externalUid: null,
      title: null,
      remarks,
      groupName,
      error: rowErrors.length > 0 ? rowErrors.join(", ") : undefined,
    })
  })

  return { rows, errors }
}
