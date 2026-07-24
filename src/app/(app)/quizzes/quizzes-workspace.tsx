"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteQuiz } from "@/lib/actions/quiz"
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
import type { Database } from "@/types/database.types"

type Course = Pick<Database["public"]["Tables"]["courses"]["Row"], "id" | "name" | "color">

type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"] & {
  courses: Pick<Course, "name" | "color"> | null
  quiz_questions: { count: number }[]
  quiz_attempts: { score: number; total_questions: number }[]
}

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20]

export function QuizzesWorkspace({ quizzes, courses }: { quizzes: QuizRow[]; courses: Course[] }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [courseId, setCourseId] = useState<string>("__none__")
  const [questionCount, setQuestionCount] = useState("10")
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsGenerating(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("questionCount", questionCount)
    if (courseId !== "__none__") formData.append("courseId", courseId)

    try {
      const res = await fetch("/api/quiz/generate", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate quiz")
        return
      }
      toast.success("Quiz generated")
      router.push(`/quizzes/${data.quizId}`)
    } catch {
      toast.error("Failed to generate quiz")
    } finally {
      setIsGenerating(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleDelete(quizId: string) {
    await deleteQuiz(quizId)
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-3 py-6">
          <p className="text-sm text-muted-foreground">
            Upload a PDF of your course material — lecture notes, slides, or a syllabus — and the
            AI will generate a practice quiz (multiple choice, true/false, and short answer) to
            test your understanding.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger size="sm" className="w-[200px]">
                <SelectValue placeholder="Course (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No course</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger size="sm" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_COUNT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} questions
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={isGenerating}
            className="h-auto cursor-pointer py-1.5 file:mr-3 file:cursor-pointer file:rounded-md file:bg-secondary file:px-3 file:py-1.5 file:text-secondary-foreground"
          />
          {isGenerating && (
            <p className="text-sm text-muted-foreground">Generating quiz — this can take a bit...</p>
          )}
        </CardContent>
      </Card>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No quizzes yet. Upload a PDF above to generate your first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q) => {
            const bestAttempt = q.quiz_attempts.reduce<
              { score: number; total_questions: number } | null
            >((best, a) => {
              if (!best) return a
              return a.score / a.total_questions > best.score / best.total_questions ? a : best
            }, null)
            const questionCount = q.quiz_questions[0]?.count ?? 0

            return (
              <Card key={q.id}>
                <CardContent className="grid gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/quizzes/${q.id}`} className="font-medium hover:underline">
                      {q.title}
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(q.id)}
                      className="h-auto p-1 text-muted-foreground hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                  {q.courses && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: q.courses.color ?? "#3b82f6" }}
                      />
                      {q.courses.name}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {questionCount} question{questionCount === 1 ? "" : "s"}
                    {q.source_filename ? ` · ${q.source_filename}` : ""}
                  </p>
                  {bestAttempt ? (
                    <Badge variant="secondary" className="w-fit">
                      Best: {bestAttempt.score}/{bestAttempt.total_questions}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="w-fit">
                      Not attempted
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
