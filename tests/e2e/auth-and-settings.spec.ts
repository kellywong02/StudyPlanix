import { test, expect } from "@playwright/test"

// See tests/e2e/smoke.spec.ts for why @mailinator.com is used here.
function uniqueEmail(tag: string) {
  return `studyplanix-${tag}-${Date.now()}@mailinator.com`
}

const PASSWORD = "SmokeTest123!"

async function logout(page: import("@playwright/test").Page) {
  await page.click('button[aria-label="Account menu"]')
  await page.click("text=Log out")
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
}

test.describe("Auth & Settings", () => {
  test("Signup with a duplicate email shows an error", async ({ page }) => {
    const email = uniqueEmail("dupe")

    // First signup succeeds
    await page.goto("/signup")
    await page.fill("#fullName", "First Signup")
    await page.fill("#email", email)
    await page.fill("#password", PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await logout(page)

    // Second signup with the same email should fail
    await page.goto("/signup")
    await page.fill("#fullName", "Second Signup")
    await page.fill("#email", email)
    await page.fill("#password", PASSWORD)
    await page.click('button[type="submit"]')

    await expect(page.locator("p.text-destructive")).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/signup/)
  })

  test("Signup with a weak password is rejected and no account is created", async ({ page }) => {
    const email = uniqueEmail("weakpw")

    await page.goto("/signup")
    await page.fill("#fullName", "Weak Password")
    await page.fill("#email", email)
    // Under the 8-character minimum (validators/auth.ts signupSchema + the
    // input's minLength=8) — the browser's native validation should block
    // submission before the form action even runs.
    await page.fill("#password", "abc123")
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/signup/)
    const isValid = await page
      .locator("#password")
      .evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(isValid).toBe(false)

    // Confirm no account exists: logging in with those exact credentials
    // should fail rather than succeed.
    await page.goto("/login")
    await page.fill("#email", email)
    await page.fill("#password", "abc123")
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator("p.text-destructive")).toBeVisible({ timeout: 10_000 })
  })

  test("Login with the wrong password shows an error and stays on the login page", async ({
    page,
  }) => {
    const email = uniqueEmail("wrongpw")

    await page.goto("/signup")
    await page.fill("#fullName", "Wrong Password Test")
    await page.fill("#email", email)
    await page.fill("#password", PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await logout(page)

    await page.fill("#email", email)
    await page.fill("#password", "TotallyWrongPassword123!")
    await page.click('button[type="submit"]')

    await expect(page.locator("p.text-destructive")).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test("Changing password in Settings allows login with the new password", async ({ page }) => {
    const email = uniqueEmail("changepw")
    const newPassword = "NewPassword456!"

    await page.goto("/signup")
    await page.fill("#fullName", "Change Password Test")
    await page.fill("#email", email)
    await page.fill("#password", PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await page.goto("/settings")
    const passwordCard = page.locator('[data-slot="card"]', { hasText: "Change password" })
    await passwordCard.locator("#currentPassword").fill(PASSWORD)
    await passwordCard.locator("#newPassword").fill(newPassword)
    await passwordCard.locator("#confirmPassword").fill(newPassword)
    await passwordCard.locator('button:has-text("Change password")').click()
    await expect(passwordCard.locator("text=Password changed successfully.")).toBeVisible({
      timeout: 10_000,
    })

    await logout(page)

    await page.fill("#email", email)
    await page.fill("#password", newPassword)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })

  test("Study preferences, school info, and grading scale persist after a reload", async ({
    page,
  }) => {
    const email = uniqueEmail("settingspersist")

    await page.goto("/signup")
    await page.fill("#fullName", "Settings Persist Test")
    await page.fill("#email", email)
    await page.fill("#password", PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await page.goto("/settings")

    const schoolCard = page.locator('[data-slot="card"]', { hasText: "School info" })
    await schoolCard.locator("#university").fill("Test University of Playwright")
    await schoolCard.locator('button:has-text("Save")').click()
    await expect(schoolCard.locator("text=Saved.")).toBeVisible({ timeout: 10_000 })

    const gradingCard = page.locator('[data-slot="card"]', { hasText: "Grading scale" })
    await gradingCard.locator("#gradingScale").click()
    await page.getByRole("option", { name: /National University of Singapore/ }).click()
    await gradingCard.locator('button:has-text("Save")').click()
    await expect(gradingCard.locator("text=Saved.")).toBeVisible({ timeout: 10_000 })

    const preferencesCard = page.locator('[data-slot="card"]', { hasText: "Study preferences" })
    await preferencesCard.locator("#studyType").click()
    await page.getByRole("option", { name: "Part-time student with a full-time job" }).click()
    await preferencesCard.locator("#studyAvailability").fill("Evenings and weekends only")
    await preferencesCard.locator('button:has-text("Save preferences")').click()
    await expect(preferencesCard.locator("text=Preferences saved.")).toBeVisible({
      timeout: 10_000,
    })

    // Regression check: this app previously had a bug where React 19 reset
    // these "uncontrolled-looking" fields back to their old value after a
    // successful form submission. Reload and confirm every field kept the
    // value that was just saved, rather than reverting.
    await page.reload()

    await expect(schoolCard.locator("#university")).toHaveValue("Test University of Playwright")
    await expect(gradingCard.locator("#gradingScale")).toContainText(
      /National University of Singapore/
    )
    await expect(preferencesCard.locator("#studyType")).toContainText(
      "Part-time student with a full-time job"
    )
    await expect(preferencesCard.locator("#studyAvailability")).toHaveValue(
      "Evenings and weekends only"
    )
  })
})
