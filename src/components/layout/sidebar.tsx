"use client"

import { SidebarNav } from "./sidebar-nav"

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <SidebarNav />
    </aside>
  )
}
