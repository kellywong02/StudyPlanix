import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getRecentNotifications } from "@/lib/actions/get-notifications"
import { Sidebar } from "@/components/layout/sidebar"
import { TopBar } from "@/components/layout/top-bar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // belt-and-suspenders: middleware already redirects unauthenticated
  // requests away from this route group
  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  const initialNotifications = await getRecentNotifications()

  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          fullName={profile?.full_name ?? null}
          email={user.email ?? null}
          initialNotifications={initialNotifications.notifications}
          initialUnreadCount={initialNotifications.unreadCount}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
