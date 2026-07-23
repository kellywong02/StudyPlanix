export type ParsedSessionRow = {
  // client-side identity for the review table, not persisted
  rowId: string
  courseCode: string
  courseName: string
  sessionType: "lecture" | "lab" | "tutorial" | "seminar" | "exam" | "other"
  location: string | null
  isRecurring: boolean
  dayOfWeek: number | null // 0=Sunday
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  specificDate: string | null // "YYYY-MM-DD"
  recurrenceStartDate: string | null
  recurrenceEndDate: string | null
  externalUid: string | null // set for ICS rows, used for upsert dedupe
  title: string | null
  remarks: string | null
  groupName: string | null
  error?: string
}

export type ParseResult = {
  rows: ParsedSessionRow[]
  errors: string[]
}
