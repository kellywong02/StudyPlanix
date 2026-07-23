"use client"

import { useTransition } from "react"

import { deleteCourse } from "@/lib/actions/courses"
import { Button } from "@/components/ui/button"

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this course and all its class sessions?")) {
          startTransition(() => deleteCourse(courseId))
        }
      }}
    >
      Delete
    </Button>
  )
}
