import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { SignupForm } from "./signup-form"

export default function SignupPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Start tracking your classes, assignments, and exams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
    </div>
  )
}
