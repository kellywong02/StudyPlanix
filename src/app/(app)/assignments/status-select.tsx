"use client"

import { useTransition } from "react"

import { updateAssignmentStatus } from "@/lib/actions/assignments"
import { ASSIGNMENT_STATUSES, STATUS_LABELS } from "@/lib/validators/assignments"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function StatusSelect({
  assignmentId,
  status,
}: {
  assignmentId: string
  status: string
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(() =>
          updateAssignmentStatus(
            assignmentId,
            value as "not_started" | "in_progress" | "done"
          )
        )
      }
    >
      <SelectTrigger size="sm" className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ASSIGNMENT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
