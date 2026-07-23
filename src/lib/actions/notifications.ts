"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

async function requireUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }
  return { supabase, userId: user.id }
}

export async function markNotificationRead(notificationId: string) {
  const { supabase, userId } = await requireUserId()
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId)

  revalidatePath("/", "layout")
}

export async function markAllNotificationsRead() {
  const { supabase, userId } = await requireUserId()
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false)

  revalidatePath("/", "layout")
}
