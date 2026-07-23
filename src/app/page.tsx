import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="grid gap-2">
        <h1 className="text-4xl font-semibold tracking-tight">StudyPlanix</h1>
        <p className="text-lg text-muted-foreground">
          Your AI-powered university companion.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </div>
  )
}
