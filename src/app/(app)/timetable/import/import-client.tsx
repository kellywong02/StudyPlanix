"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { commitImportRows, type CommitRow, type CourseSelection } from "@/lib/actions/import"
import type { ParsedSessionRow } from "@/lib/import/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Database } from "@/types/database.types"

type Course = Database["public"]["Tables"]["courses"]["Row"]

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function ImportClient({ courses }: { courses: Course[] }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedSessionRow[]>([])
  const [selections, setSelections] = useState<Record<string, CourseSelection>>({})
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)

  function findExistingCourseId(row: ParsedSessionRow): string | undefined {
    return courses.find(
      (c) =>
        (row.courseCode && c.code?.toLowerCase() === row.courseCode.toLowerCase()) ||
        c.name.toLowerCase() === row.courseName.toLowerCase()
    )?.id
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setRows([])
    setParseErrors([])

    const isIcs = file.name.toLowerCase().endsWith(".ics")
    const endpoint = isIcs ? "/api/import/ics" : "/api/import/xlsx"

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(endpoint, { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to parse file")
        return
      }
      setRows(data.rows)
      setParseErrors(data.errors ?? [])

      const initialSelections: Record<string, CourseSelection> = {}
      for (const row of data.rows as ParsedSessionRow[]) {
        const existingId = findExistingCourseId(row)
        initialSelections[row.rowId] = existingId
          ? { type: "existing", courseId: existingId }
          : { type: "new" }
      }
      setSelections(initialSelections)
    } catch {
      toast.error("Failed to parse file")
    } finally {
      setIsParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleConfirm() {
    setIsCommitting(true)
    const commitRows: CommitRow[] = rows
      .filter((r) => !r.error)
      .map((r) => ({ ...r, courseSelection: selections[r.rowId] ?? { type: "new" } }))

    const result = await commitImportRows(commitRows)
    setIsCommitting(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(
      `Import complete: ${result.created ?? 0} created, ${result.updated ?? 0} updated, ${result.unchanged ?? 0} unchanged`
    )
    router.push("/timetable")
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-3 py-6">
          <p className="text-sm text-muted-foreground">
            Upload an .ics calendar export, or an .xlsx/.csv file using the columns: Course
            Code, Course Name, Start Time, End Time, Location, Session Type, Date, Group,
            Remarks. Every row needs a Date — if a class meets weekly but the day or time
            shifts around, just add one row per occurrence with its own Date. Group is
            optional — fill it in if you're enrolled in a specific group/section for that
            class (e.g. &quot;Tutorial Group 3&quot;).
          </p>
          <a
            href="/timetable-template.xlsx"
            download
            className="w-fit text-sm text-primary underline underline-offset-4"
          >
            Download .xlsx template
          </a>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".ics,.xlsx,.csv"
            onChange={handleFileChange}
            disabled={isParsing}
            className="h-auto cursor-pointer py-1.5 file:mr-3 file:cursor-pointer file:rounded-md file:bg-secondary file:px-3 file:py-1.5 file:text-secondary-foreground"
          />
        </CardContent>
      </Card>

      {parseErrors.length > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="py-4">
            <p className="mb-2 text-sm font-medium text-destructive">
              {parseErrors.length} issue(s) found:
            </p>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {parseErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Course</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.rowId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {row.title || row.courseName}
                      {row.error && <Badge variant="destructive">Skipped</Badge>}
                    </div>
                    {row.error && (
                      <p className="text-xs text-destructive">{row.error}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.isRecurring
                      ? `${DAY_LABELS[row.dayOfWeek ?? 0]} ${row.startTime}-${row.endTime}`
                      : `${row.specificDate} ${row.startTime}-${row.endTime}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.location ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.groupName ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground" title={row.remarks ?? undefined}>
                    {row.remarks ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={(() => {
                        const sel = selections[row.rowId]
                        return sel?.type === "existing" ? sel.courseId : "__new__"
                      })()}
                      onValueChange={(value) =>
                        setSelections((prev) => ({
                          ...prev,
                          [row.rowId]:
                            value === "__new__"
                              ? { type: "new" }
                              : { type: "existing", courseId: value },
                        }))
                      }
                      disabled={!!row.error}
                    >
                      <SelectTrigger size="sm" className="w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__new__">
                          Create new: {row.courseName}
                          {row.courseCode ? ` (${row.courseCode})` : ""}
                        </SelectItem>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            {c.code ? ` (${c.code})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <CardContent className="flex justify-end gap-2 pt-4">
            <Button onClick={handleConfirm} disabled={isCommitting}>
              {isCommitting ? "Importing..." : `Confirm import (${rows.filter((r) => !r.error).length} sessions)`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
