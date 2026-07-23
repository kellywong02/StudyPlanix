"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { NAV_ITEMS } from "./nav-config"

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <Link href="/dashboard" onClick={onNavigate}>
          <Image
            src="/logo.png"
            alt="StudyPlanix"
            width={180}
            height={180}
            priority
            className="rounded-2xl"
          />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="m-3 rounded-xl bg-sidebar-accent p-4 text-center">
        <span className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </span>
        <p className="text-sm font-medium">Need help?</p>
        <p className="mb-3 text-xs text-muted-foreground">Ask StudyPlanix AI</p>
        <Button asChild size="sm" className="w-full" onClick={onNavigate}>
          <Link href="/ai-assistant">Chat Now</Link>
        </Button>
      </div>
    </div>
  )
}
