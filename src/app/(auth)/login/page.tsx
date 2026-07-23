import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { LoginForm } from "./login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmEmail?: string }>
}) {
  const { confirmEmail } = await searchParams

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Log in to StudyPlanix</CardTitle>
          <CardDescription>
            Your AI-powered university companion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm confirmEmail={confirmEmail === "1"} />
        </CardContent>
      </Card>
    </div>
  )
}
