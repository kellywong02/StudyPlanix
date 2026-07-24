"use client"

import { useState, useTransition } from "react"
import { X } from "lucide-react"

import { updateGradingScale } from "@/lib/actions/profile"
import {
  CUSTOM_GRADING_SCALE_ID,
  PRESET_GRADING_SCALES,
  type GradePoint,
} from "@/lib/grading-scales"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function GradingScaleForm({
  gradingScaleId,
  customGradeScale,
}: {
  gradingScaleId: string
  customGradeScale: GradePoint[] | null
}) {
  const scalesByCountry = new Map<string, typeof PRESET_GRADING_SCALES>()
  for (const s of PRESET_GRADING_SCALES) {
    const list = scalesByCountry.get(s.country) ?? []
    list.push(s)
    scalesByCountry.set(s.country, list)
  }

  const [scaleId, setScaleId] = useState(gradingScaleId)
  const [customGrades, setCustomGrades] = useState<GradePoint[]>(customGradeScale ?? [])
  const [gradeInput, setGradeInput] = useState("")
  const [pointsInput, setPointsInput] = useState("")
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)

  function addCustomGrade() {
    const grade = gradeInput.trim()
    const points = Number(pointsInput)
    if (!grade || Number.isNaN(points)) return
    setCustomGrades((prev) => [...prev.filter((g) => g.grade !== grade), { grade, points }])
    setGradeInput("")
    setPointsInput("")
  }

  function handleSave() {
    setResult(null)
    startTransition(async () => {
      const res = await updateGradingScale({
        gradingScaleId: scaleId,
        customGradeScale: scaleId === CUSTOM_GRADING_SCALE_ID ? customGrades : undefined,
      })
      setResult(res)
    })
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="gradingScale">Grading scale</Label>
        <Select value={scaleId} onValueChange={setScaleId}>
          <SelectTrigger id="gradingScale" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from(scalesByCountry.entries()).map(([country, scales]) => (
              <SelectGroup key={country}>
                <SelectLabel>{country}</SelectLabel>
                {scales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label} ({s.maxPoints.toFixed(1)} scale)
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            <SelectSeparator />
            <SelectItem value={CUSTOM_GRADING_SCALE_ID}>Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {scaleId === CUSTOM_GRADING_SCALE_ID && (
        <div className="grid gap-2">
          <Label>Custom grades</Label>
          {customGrades.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {customGrades.map((g) => (
                <Badge key={g.grade} variant="secondary" className="gap-1 pr-1">
                  {g.grade} = {g.points}
                  <button
                    type="button"
                    aria-label={`Remove ${g.grade}`}
                    onClick={() => setCustomGrades((prev) => prev.filter((x) => x.grade !== g.grade))}
                    className="rounded-full hover:bg-muted-foreground/20"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={gradeInput}
              onChange={(e) => setGradeInput(e.target.value)}
              placeholder="Grade, e.g. A+"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addCustomGrade()
                }
              }}
            />
            <Input
              type="number"
              step="0.01"
              value={pointsInput}
              onChange={(e) => setPointsInput(e.target.value)}
              placeholder="Points, e.g. 4.0"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addCustomGrade()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addCustomGrade}>
              Add
            </Button>
          </div>
        </div>
      )}

      {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
      {result?.success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
      )}

      <Button type="button" disabled={isPending} onClick={handleSave} className="w-fit">
        {isPending ? "Saving..." : "Save"}
      </Button>
    </div>
  )
}
