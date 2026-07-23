"use client"

import { useState, useTransition } from "react"

import { generateStudyPlan } from "@/lib/actions/study-plan"
import { Button } from "@/components/ui/button"

export function GeneratePlanButton({ hasExistingPlan }: { hasExistingPlan: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        disabled={isPending}
        className="w-fit"
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await generateStudyPlan()
            if (result.error) setError(result.error)
          })
        }}
      >
        {isPending
          ? "Generating..."
          : hasExistingPlan
            ? "Regenerate study plan"
            : "Generate study plan"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
