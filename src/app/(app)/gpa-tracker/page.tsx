import { BarChart3 } from "lucide-react"

import { ComingSoonCard } from "@/components/coming-soon"

export default function GpaTrackerPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">GPA Tracker</h1>
      <ComingSoonCard
        icon={BarChart3}
        title="GPA Tracker"
        description="Track grades per course and watch your GPA trend across semesters. Coming in a future update."
      />
    </div>
  )
}
