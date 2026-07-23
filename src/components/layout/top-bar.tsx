"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, ChevronDown, LogOut, Menu, Settings } from "lucide-react"

import { logout } from "@/lib/actions/auth"
import {
  getRecentNotifications,
  type NotificationRow,
} from "@/lib/actions/get-notifications"
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SidebarNav } from "@/components/layout/sidebar-nav"

const POLL_INTERVAL_MS = 60_000

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function TopBar({
  fullName,
  email,
  initialNotifications,
  initialUnreadCount,
}: {
  fullName: string | null
  email: string | null
  initialNotifications: NotificationRow[]
  initialUnreadCount: number
}) {
  const displayName = fullName || email || "Account"
  const [notifications, setNotifications] = useState(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await getRecentNotifications()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  async function handleNotificationClick(notification: NotificationRow) {
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      await markNotificationRead(notification.id)
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    await markAllNotificationsRead()
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b px-4 py-3 md:justify-end md:px-6">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <button
            className="flex size-9 items-center justify-center rounded-md hover:bg-accent md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative flex size-9 items-center justify-center rounded-md hover:bg-accent">
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="flex items-center justify-between px-2 py-1.5">
            <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-0.5 whitespace-normal"
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="flex w-full items-center gap-2">
                    {!n.is_read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    <span className="text-sm font-medium">{n.title}</span>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                  <p className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Account menu"
            className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials(displayName).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex w-full items-center gap-2">
              <Settings className="size-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <form action={logout} className="w-full">
              <button type="submit" className="flex w-full items-center gap-2">
                <LogOut className="size-4" />
                Log out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </div>
  )
}
