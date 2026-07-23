import "server-only"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database.types"

// Service-role client: bypasses RLS. Never import this outside the cron/notifications
// route — it must operate across all users, not one authenticated session.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
