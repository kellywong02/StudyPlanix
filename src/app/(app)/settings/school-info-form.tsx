"use client"

import { useEffect, useRef, useState, useTransition } from "react"

import { updateSchoolInfo } from "@/lib/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type UniversitySuggestion = { name: string; country: string }

export function SchoolInfoForm({ university }: { university: string | null }) {
  const [school, setSchool] = useState(university ?? "")
  const [suggestions, setSuggestions] = useState<UniversitySuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)
  const skipNextFetch = useRef(false)

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    if (school.trim().length < 3) {
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      fetch(`/api/universities?q=${encodeURIComponent(school.trim())}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data: { universities: UniversitySuggestion[] }) => {
          setSuggestions(data.universities)
          setShowSuggestions(true)
        })
        .catch(() => {})
    }, 300)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [school])

  function handleSelect(name: string) {
    skipNextFetch.current = true
    setSchool(name)
    setSuggestions([])
    setShowSuggestions(false)
  }

  function handleSave() {
    setResult(null)
    startTransition(async () => {
      const res = await updateSchoolInfo({ university: school })
      setResult(res)
    })
  }

  return (
    <div className="grid gap-4">
      <div className="relative grid gap-2">
        <Label htmlFor="university">School / University</Label>
        <Input
          id="university"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Start typing your school name..."
          autoComplete="off"
        />
        {showSuggestions && school.trim().length >= 3 && suggestions.length > 0 && (
          <ul className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
            {suggestions.map((s, i) => (
              <li key={`${s.name}-${i}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(s.name)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <span>{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.country}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
