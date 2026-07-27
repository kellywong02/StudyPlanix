"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function AppearanceForm() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Standard next-themes hydration guard: `theme` is undefined on the server
  // and on the client's first render, so button variants must not depend on
  // it until after mount to avoid a hydration mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant={mounted && theme === "light" ? "default" : "outline"}
        onClick={() => setTheme("light")}
      >
        <Sun className="size-4" />
        Light
      </Button>
      <Button
        type="button"
        variant={mounted && theme === "dark" ? "default" : "outline"}
        onClick={() => setTheme("dark")}
      >
        <Moon className="size-4" />
        Dark
      </Button>
    </div>
  )
}
