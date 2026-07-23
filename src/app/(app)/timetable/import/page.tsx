import { createClient } from "@/lib/supabase/server"

import { ImportClient } from "./import-client"

export default async function TimetableImportPage() {
  const supabase = await createClient()
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("archived", false)
    .order("name")

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Import timetable</h1>
      <ImportClient courses={courses ?? []} />
    </div>
  )
}
