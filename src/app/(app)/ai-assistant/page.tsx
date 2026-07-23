import { Sparkles } from "lucide-react"

import { ComingSoonCard } from "@/components/coming-soon"

export default function AiAssistantPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">AI Assistant</h1>
      <ComingSoonCard
        icon={Sparkles}
        title="Ask StudyPlanix AI"
        description="A chat assistant that can answer questions about your classes, assignments, and study plan is coming in a future update."
      />
    </div>
  )
}
