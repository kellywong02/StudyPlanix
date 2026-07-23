"use client"

import Link from "next/link"
import { useState } from "react"

import { STATUS_LABELS } from "@/lib/validators/assignments"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function AssignmentInfoDialog({
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  title,
  courseName,
  dueDateLabel,
  status,
  priority,
  description,
  overdue,
  courseId,
  assignmentId,
}: {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  courseName?: string | null
  dueDateLabel: string
  status: string
  priority?: string | null
  description?: string | null
  overdue: boolean
  courseId: string
  assignmentId: string
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChangeProp ?? setInternalOpen

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <span className="contents cursor-pointer" onClick={() => setOpen(true)}>
          {trigger}
        </span>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 text-sm">
          {courseName && (
            <p>
              <span className="text-muted-foreground">Course: </span>
              {courseName}
            </p>
          )}
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Due: </span>
            {dueDateLabel}
            {overdue && <Badge variant="destructive">Overdue</Badge>}
          </p>
          <p>
            <span className="text-muted-foreground">Status: </span>
            {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}
          </p>
          {priority && (
            <p>
              <span className="text-muted-foreground">Priority: </span>
              {priority[0].toUpperCase() + priority.slice(1)}
            </p>
          )}
          {description && (
            <p>
              <span className="text-muted-foreground">Description: </span>
              {description}
            </p>
          )}
        </div>
        <Button asChild className="mt-2 w-fit">
          <Link href={`/assignments?course=${courseId}&edit=${assignmentId}`}>Edit</Link>
        </Button>
      </DialogContent>
    </Dialog>
  )
}
