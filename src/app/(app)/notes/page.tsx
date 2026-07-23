import { createClient } from "@/lib/supabase/server"

import { NotesWorkspace } from "./notes-workspace"

export default async function NotesPage() {
  const supabase = await createClient()

  const [{ data: notes }, { data: courses }] = await Promise.all([
    supabase
      .from("notes")
      .select("*, courses(name, color)")
      .order("updated_at", { ascending: false }),
    supabase.from("courses").select("id, name, color").eq("archived", false).order("name"),
  ])

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Notes</h1>
      <NotesWorkspace notes={notes ?? []} courses={courses ?? []} />
    </div>
  )
}
