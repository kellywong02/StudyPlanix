import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { isDueSoon, isOverdue } from "@/lib/assignment-status"
import { STATUS_LABELS } from "@/lib/validators/assignments"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { AssignmentDialog } from "./assignment-dialog"
import { DeleteAssignmentButton } from "./delete-assignment-button"
import { StatusSelect } from "./status-select"

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; status?: string; new?: string; edit?: string }>
}) {
  const {
    course: courseFilter,
    status: statusFilter,
    new: autoOpenNew,
    edit: autoOpenEditId,
  } = await searchParams
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("archived", false)
    .order("name")

  if (!courses?.length) {
    return (
      <div className="grid gap-6">
        <h1 className="text-2xl font-semibold">Assignments</h1>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You need a course before you can add assignments.{" "}
            <Link href="/courses" className="underline underline-offset-4">
              Add a course first
            </Link>
            .
          </CardContent>
        </Card>
      </div>
    )
  }

  let query = supabase
    .from("assignments")
    .select("*, courses(name, color, code)")
    .order("due_date", { ascending: true })

  if (courseFilter) query = query.eq("course_id", courseFilter)
  if (statusFilter) query = query.eq("status", statusFilter)

  const { data: assignments } = await query

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Assignments</h1>
        <AssignmentDialog
          courses={courses}
          trigger={<Button>New assignment</Button>}
          defaultOpen={autoOpenNew === "1"}
          defaultCourseId={courseFilter}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/assignments">
          <Button variant={!courseFilter && !statusFilter ? "secondary" : "outline"} size="sm">
            All
          </Button>
        </Link>
        {courses.map((c) => (
          <Link key={c.id} href={`/assignments?course=${c.id}`}>
            <Button variant={courseFilter === c.id ? "secondary" : "outline"} size="sm">
              {c.name}
            </Button>
          </Link>
        ))}
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <Link key={value} href={`/assignments?status=${value}`}>
            <Button variant={statusFilter === value ? "secondary" : "outline"} size="sm">
              {label}
            </Button>
          </Link>
        ))}
      </div>

      {!assignments?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No assignments match this filter.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => {
                const overdue = isOverdue(a.due_date, a.status)
                const dueSoon = isDueSoon(a.due_date, a.status)
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <AssignmentDialog
                        courses={courses}
                        assignment={a}
                        defaultOpen={a.id === autoOpenEditId}
                        trigger={
                          <button className="text-left underline-offset-4 hover:underline">
                            {a.title}
                          </button>
                        }
                      />
                    </TableCell>
                    <TableCell>{a.courses?.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {new Date(a.due_date).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {overdue && <Badge variant="destructive">Overdue</Badge>}
                        {!overdue && dueSoon && <Badge>Due soon</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusSelect assignmentId={a.id} status={a.status} />
                    </TableCell>
                    <TableCell>
                      <DeleteAssignmentButton assignmentId={a.id} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
