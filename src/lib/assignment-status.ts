const DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000

export function isOverdue(dueDate: string, status: string, now = new Date()) {
  return status !== "done" && new Date(dueDate) < now
}

export function isDueSoon(dueDate: string, status: string, now = new Date()) {
  if (status === "done") return false
  const due = new Date(dueDate)
  return due >= now && due.getTime() - now.getTime() <= DUE_SOON_WINDOW_MS
}
