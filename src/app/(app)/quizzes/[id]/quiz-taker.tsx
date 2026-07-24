"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { submitQuizAttempt, type QuestionResult } from "@/lib/actions/quiz"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/database.types"

type QuizQuestion = Database["public"]["Tables"]["quiz_questions"]["Row"]
type PastAttempt = { score: number; total_questions: number; completed_at: string }

export function QuizTaker({
  quizId,
  questions,
  pastAttempts,
}: {
  quizId: string
  questions: QuizQuestion[]
  pastAttempts: PastAttempt[]
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{
    score: number
    totalQuestions: number
    results: QuestionResult[]
  } | null>(null)

  const resultsByQuestionId = new Map(result?.results.map((r) => [r.questionId, r]) ?? [])

  function handleSubmit() {
    startTransition(async () => {
      const res = await submitQuizAttempt(quizId, answers)
      if (res.error || !res.results) {
        toast.error(res.error ?? "Failed to submit quiz")
        return
      }
      setResult({ score: res.score!, totalQuestions: res.totalQuestions!, results: res.results })
    })
  }

  function handleRetake() {
    setAnswers({})
    setResult(null)
  }

  const allAnswered = questions.every((q) => (answers[q.id] ?? "").trim().length > 0)

  return (
    <div className="grid gap-6">
      {pastAttempts.length > 0 && !result && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Past attempts:
          {pastAttempts.map((a, i) => (
            <Badge key={i} variant="outline">
              {a.score}/{a.total_questions}
            </Badge>
          ))}
        </div>
      )}

      {result && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-3xl font-semibold">
              {result.score}/{result.totalQuestions}
            </p>
            <p className="text-sm text-muted-foreground">Quiz complete</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {questions.map((q, index) => {
          const options =
            q.question_type === "short_answer" ? null : (q.options as string[] | null)
          const qResult = resultsByQuestionId.get(q.id)

          return (
            <Card key={q.id} data-testid="quiz-question">
              <CardContent className="grid gap-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">
                    {index + 1}. {q.question_text}
                  </p>
                  {qResult && (
                    <Badge variant={qResult.isCorrect ? "default" : "destructive"}>
                      {qResult.isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  )}
                </div>

                {options ? (
                  <div className="grid gap-2">
                    {options.map((opt) => {
                      const isSelected = answers[q.id] === opt
                      const isCorrectOption = qResult && qResult.correctAnswer === opt
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={!!result}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          className={cn(
                            "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                            isSelected && !result && "border-primary bg-primary/10",
                            !isSelected && !result && "hover:bg-accent",
                            result && isCorrectOption && "border-green-600 bg-green-600/10",
                            result &&
                              isSelected &&
                              !isCorrectOption &&
                              "border-destructive bg-destructive/10"
                          )}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <Textarea
                    value={answers[q.id] ?? ""}
                    disabled={!!result}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    placeholder="Your answer..."
                  />
                )}

                {qResult && (
                  <div className="grid gap-1 text-sm">
                    {q.question_type === "short_answer" && (
                      <p className="text-muted-foreground">Model answer: {qResult.correctAnswer}</p>
                    )}
                    {qResult.feedback && (
                      <p className="text-muted-foreground">{qResult.feedback}</p>
                    )}
                    {qResult.explanation && (
                      <p className="text-muted-foreground">{qResult.explanation}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-end gap-2">
        {result ? (
          <Button onClick={handleRetake}>Retake quiz</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isPending || !allAnswered}>
            {isPending ? "Grading..." : "Submit quiz"}
          </Button>
        )}
      </div>
    </div>
  )
}
