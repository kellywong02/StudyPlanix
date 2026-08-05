"use client"

import { useMemo, useState } from "react"
import {
  Calendar,
  dateFnsLocalizer,
  type Event as RBCEvent,
  type View,
} from "react-big-calendar"
import { format, getDay, parse, startOfWeek } from "date-fns"
import { enUS } from "date-fns/locale"

import {
  expandAssignments,
  expandClassSessions,
  type AssignmentLike,
  type ClassSessionLike,
  type CalendarEvent,
} from "@/lib/calendar/expand-recurrence"
import { AssignmentInfoDialog } from "@/components/assignment-info-dialog"
import { SessionInfoDialog } from "@/components/session-info-dialog"
import { isOverdue } from "@/lib/assignment-status"

import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar-view.css"

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: enUS }),
  getDay,
  locales: { "en-US": enUS },
})

function getVisibleRange(range: Date[] | { start: Date; end: Date }) {
  if (Array.isArray(range)) {
    return { start: range[0], end: range[range.length - 1] }
  }
  return range
}

function formatTime(date: Date) {
  return format(date, "h:mm a")
}

function formatDateWithDay(date: Date) {
  return format(date, "yyyy-MM-dd (EEE)")
}

export function CalendarView({
  sessions,
  assignments,
}: {
  sessions: ClassSessionLike[]
  assignments: AssignmentLike[]
}) {
  const now = new Date()
  const [range, setRange] = useState<{ start: Date; end: Date }>({
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  })
  // explicitly control date/view rather than relying on react-big-calendar's
  // internal uncontrolled state — that path wasn't reliably re-rendering the
  // toolbar on Back/Next clicks
  const [date, setDate] = useState(now)
  const [view, setView] = useState<View>("month")
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const events = useMemo<CalendarEvent[]>(() => {
    return [
      ...expandClassSessions(sessions, range.start, range.end),
      ...expandAssignments(assignments, range.start, range.end),
    ]
  }, [sessions, assignments, range])

  return (
    <div style={{ height: 720 }}>
      <Calendar
        localizer={localizer}
        events={events as unknown as RBCEvent[]}
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        style={{ height: "100%" }}
        date={date}
        view={view}
        onNavigate={setDate}
        onView={setView}
        onRangeChange={(newRange) => setRange(getVisibleRange(newRange))}
        onSelectEvent={(event) => setSelectedEvent(event as unknown as CalendarEvent)}
        eventPropGetter={(event) => {
          const e = event as unknown as CalendarEvent
          if (e.resource.type === "assignment") {
            const overdue = e.resource.status !== "done" && e.end < new Date()
            return {
              style: {
                backgroundColor: overdue ? "#ef4444" : "#a1a1aa",
                textDecoration: e.resource.status === "done" ? "line-through" : undefined,
              },
            }
          }
          return { style: { backgroundColor: e.resource.color } }
        }}
      />

      {selectedEvent && selectedEvent.resource.type === "class" && (
        <SessionInfoDialog
          open
          onOpenChange={(open) => !open && setSelectedEvent(null)}
          title={selectedEvent.title}
          courseName={selectedEvent.resource.courseName}
          dateLabel={formatDateWithDay(selectedEvent.start)}
          timeLabel={`${formatTime(selectedEvent.start)} – ${formatTime(selectedEvent.end)}`}
          location={selectedEvent.resource.location}
          groupName={selectedEvent.resource.groupName}
          remarks={selectedEvent.resource.remarks}
          notes={selectedEvent.resource.notes}
          courseId={selectedEvent.resource.courseId}
          sessionId={selectedEvent.resource.sessionId}
          lessonNumber={selectedEvent.resource.lessonNumber ?? undefined}
          sessionType={selectedEvent.resource.sessionType}
        />
      )}

      {selectedEvent && selectedEvent.resource.type === "assignment" && (
        <AssignmentInfoDialog
          open
          onOpenChange={(open) => !open && setSelectedEvent(null)}
          title={selectedEvent.title.replace(/^Due: /, "")}
          courseName={selectedEvent.resource.courseName}
          dueDateLabel={`${formatDateWithDay(selectedEvent.end)} · ${formatTime(selectedEvent.end)}`}
          status={selectedEvent.resource.status}
          priority={selectedEvent.resource.priority}
          description={selectedEvent.resource.description}
          overdue={isOverdue(selectedEvent.end.toISOString(), selectedEvent.resource.status)}
          courseId={selectedEvent.resource.courseId}
          assignmentId={selectedEvent.resource.assignmentId}
        />
      )}
    </div>
  )
}
