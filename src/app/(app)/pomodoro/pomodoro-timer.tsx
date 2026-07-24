"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react"
import { toast } from "sonner"

import { logPomodoroSession } from "@/lib/actions/pomodoro"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Mode = "focus" | "short_break" | "long_break"
type Course = { id: string; name: string; color: string | null }

const MODE_LABELS: Record<Mode, string> = {
  focus: "Focus",
  short_break: "Short break",
  long_break: "Long break",
}

const CYCLES_BEFORE_LONG_BREAK = 4

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = "sine"
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.6)
    oscillator.onended = () => ctx.close()
  } catch {
    // ignore — audio isn't essential
  }
}

function notify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission === "granted") {
    new Notification(title, { body })
  }
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function PomodoroTimer({ courses }: { courses: Course[] }) {
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5)
  const [longBreakMinutes, setLongBreakMinutes] = useState(15)

  const durationFor = (m: Mode) =>
    m === "focus" ? focusMinutes : m === "short_break" ? shortBreakMinutes : longBreakMinutes

  const [mode, setMode] = useState<Mode>("focus")
  const [remainingSeconds, setRemainingSeconds] = useState(focusMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [cyclesCompleted, setCyclesCompleted] = useState(0)
  const [courseId, setCourseId] = useState("none")

  const endAtRef = useRef<number | null>(null)

  // awaits the save before switching modes/notifying, so that by the time the
  // UI shows "complete" the session is guaranteed committed — otherwise a
  // reader who immediately jumps to Analytics can catch the write in flight
  async function handleComplete() {
    setIsRunning(false)
    playBeep()

    const completedMode = mode
    const minutes = durationFor(completedMode)

    if (completedMode === "focus") {
      const result = await logPomodoroSession({
        courseId: courseId === "none" ? null : courseId,
        sessionType: "focus",
        durationMinutes: minutes,
      })
      if (result.error) {
        toast.error("Couldn't save this study session", { description: result.error })
      }
    }

    const newCycles = completedMode === "focus" ? cyclesCompleted + 1 : cyclesCompleted
    if (completedMode === "focus") setCyclesCompleted(newCycles)

    const nextMode: Mode =
      completedMode === "focus"
        ? newCycles % CYCLES_BEFORE_LONG_BREAK === 0
          ? "long_break"
          : "short_break"
        : "focus"

    notify(
      `${MODE_LABELS[completedMode]} complete!`,
      nextMode === "focus" ? "Time to focus again." : "Take a break."
    )
    toast.success(`${MODE_LABELS[completedMode]} complete!`, {
      description: nextMode === "focus" ? "Time to focus again." : "Take a break.",
    })

    setMode(nextMode)
    setRemainingSeconds(durationFor(nextMode) * 60)
  }

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      const endAt = endAtRef.current
      if (endAt === null) return
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      setRemainingSeconds(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        handleComplete()
      }
    }, 250)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only restarts on isRunning; handleComplete/etc reflect current state via closure since inputs are disabled while running
  }, [isRunning])

  async function handleStart() {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission()
    }
    const seconds = remainingSeconds > 0 ? remainingSeconds : durationFor(mode) * 60
    setRemainingSeconds(seconds)
    endAtRef.current = Date.now() + seconds * 1000
    setIsRunning(true)
  }

  function handlePause() {
    setIsRunning(false)
  }

  function handleReset() {
    setIsRunning(false)
    setRemainingSeconds(durationFor(mode) * 60)
  }

  function handleSkip() {
    setIsRunning(false)
    // skipping doesn't count as completing the session, so it doesn't log
    // a session or advance the long-break cycle count — it just moves on
    const nextMode: Mode = mode === "focus" ? "short_break" : "focus"
    setMode(nextMode)
    setRemainingSeconds(durationFor(nextMode) * 60)
  }

  function updateDuration(m: Mode, value: number) {
    const minutes = Math.max(1, Math.min(180, value || 1))
    if (m === "focus") setFocusMinutes(minutes)
    if (m === "short_break") setShortBreakMinutes(minutes)
    if (m === "long_break") setLongBreakMinutes(minutes)
    if (mode === m && !isRunning) setRemainingSeconds(minutes * 60)
  }

  return (
    <div className="grid max-w-md gap-6">
      <div className="grid gap-1 text-center">
        <p className="text-sm font-medium text-muted-foreground">{MODE_LABELS[mode]}</p>
        <p className="text-6xl font-semibold tabular-nums">{formatTime(remainingSeconds)}</p>
        <p className="text-xs text-muted-foreground">
          {cyclesCompleted} focus session{cyclesCompleted === 1 ? "" : "s"} completed
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {!isRunning ? (
          <Button type="button" onClick={handleStart}>
            <Play className="size-4" /> Start
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={handlePause}>
            <Pause className="size-4" /> Pause
          </Button>
        )}
        <Button type="button" variant="outline" onClick={handleReset}>
          <RotateCcw className="size-4" /> Reset
        </Button>
        <Button type="button" variant="ghost" onClick={handleSkip}>
          <SkipForward className="size-4" /> Skip
        </Button>
      </div>

      <div className="grid gap-2">
        <Label>Course (optional)</Label>
        <Select value={courseId} onValueChange={setCourseId} disabled={isRunning}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No course</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="focusMinutes" className="text-xs">
            Focus (min)
          </Label>
          <Input
            id="focusMinutes"
            type="number"
            min={1}
            max={180}
            value={focusMinutes}
            disabled={isRunning}
            onChange={(e) => updateDuration("focus", Number(e.target.value))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="shortBreakMinutes" className="text-xs">
            Short break
          </Label>
          <Input
            id="shortBreakMinutes"
            type="number"
            min={1}
            max={180}
            value={shortBreakMinutes}
            disabled={isRunning}
            onChange={(e) => updateDuration("short_break", Number(e.target.value))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="longBreakMinutes" className="text-xs">
            Long break
          </Label>
          <Input
            id="longBreakMinutes"
            type="number"
            min={1}
            max={180}
            value={longBreakMinutes}
            disabled={isRunning}
            onChange={(e) => updateDuration("long_break", Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  )
}
