// Literal unions mirroring the CHECK constraints in supabase/migrations/*.sql.
// database.types.ts (generated) types these columns as plain `string` since
// Postgres CHECK constraints aren't reflected as enums — use these instead
// wherever app code needs to narrow/switch on the value.

export type SessionType =
  | "lecture"
  | "lab"
  | "tutorial"
  | "seminar"
  | "exam"
  | "other"

export type ClassSessionSource = "manual" | "ics_import" | "xlsx_import"

export type AssignmentStatus = "not_started" | "in_progress" | "done"

export type AssignmentPriority = "low" | "medium" | "high"

export type NotificationType =
  | "assignment_due_soon"
  | "assignment_overdue"
  | "exam_upcoming"
  | "class_starting_soon"
  | "system"
