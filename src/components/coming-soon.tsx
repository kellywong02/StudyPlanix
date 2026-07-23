import type { LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function ComingSoonCard({
  icon: Icon,
  title,
  description,
  compact = false,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  compact?: boolean
  className?: string
}) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          "flex flex-col items-center justify-center gap-2 text-center",
          compact ? "py-4" : "py-10"
        )}
      >
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Coming soon
        </span>
        <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
