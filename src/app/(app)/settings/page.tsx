import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { ChangePasswordForm } from "./change-password-form"
import { SchoolInfoForm } from "./school-info-form"
import { StudyPreferencesForm } from "./study-preferences-form"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("study_type, study_availability, university")
    .eq("id", user!.id)
    .single()

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>School info</CardTitle>
        </CardHeader>
        <CardContent>
          <SchoolInfoForm university={profile?.university ?? null} />
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Study preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <StudyPreferencesForm
            studyType={profile?.study_type ?? "full_time"}
            studyAvailability={profile?.study_availability ?? null}
          />
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
