"use client"

import { useState, useTransition } from "react"

import { updateStudyPreferences } from "@/lib/actions/profile"
import { STUDY_TYPES, STUDY_TYPE_LABELS } from "@/lib/validators/study-plan"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export function StudyPreferencesForm({
  studyType,
  studyAvailability,
}: {
  studyType: string
  studyAvailability: string | null
}) {
  const [type, setType] = useState(studyType)
  const [availability, setAvailability] = useState(studyAvailability ?? "")
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)

  function handleSave() {
    setResult(null)
    startTransition(async () => {
      const res = await updateStudyPreferences({
        studyType: type,
        studyAvailability: availability || undefined,
      })
      setResult(res)
    })
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="studyType">Your situation</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="studyType" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STUDY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {STUDY_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="studyAvailability">Availability notes (optional)</Label>
        <Textarea
          id="studyAvailability"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          placeholder="e.g. Work Mon-Fri 9am-5pm, only free evenings and weekends"
          rows={3}
        />
      </div>

      {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
      {result?.success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Preferences saved.</p>
      )}

      <Button type="button" disabled={isPending} onClick={handleSave} className="w-fit">
        {isPending ? "Saving..." : "Save preferences"}
      </Button>
    </div>
  )
}
