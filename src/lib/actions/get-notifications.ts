"use server"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"]

export async function getRecentNotifications(): Promise<{
  notifications: NotificationRow[]
  unreadCount: number
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { notifications: [], unreadCount: 0 }

  const [{ data: notifications }, { count: unreadCount }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false),
  ])

  return { notifications: notifications ?? [], unreadCount: unreadCount ?? 0 }
}
