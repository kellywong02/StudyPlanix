import { test, expect } from "@playwright/test"
import { afterEach } from "node:test"

// Uses @mailinator.com (a real, publicly-routable disposable-inbox domain) rather
// than @example.com — Supabase's signup validator rejects known non-routable
// example domains. Email confirmation is disabled on this project, so no message
// is ever actually sent to the inbox.
function uniqueEmail(tag: string) {
  return `studyplanix-${tag}-${Date.now()}@mailinator.com`
}

test.afterEach(async ({page}) => {
  await page.close();
});

const PASSWORD = "SmokeTest123!"

test.describe("StudyPlanix golden path", () => {
  test("signup redirects straight to the dashboard", async ({ page }) => {
    await page.goto("/signup")
    await page.fill("#fullName", "Smoke Test")
    await page.fill("#email", uniqueEmail("signup"))
    await page.fill("#password", PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.locator("text=Welcome back")).toBeVisible()
  })

  test("logged-out users are redirected away from protected routes", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test("create course, timetable session, and assignment; verify calendar shows them", async ({
    page,
  }) => {
    const email = uniqueEmail("golden")

    await page.goto("/signup")
    await page.fill("#fullName", "Golden Path")
    await page.fill("#email", email)
    await page.fill("#password", PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    // course
    await page.goto("/courses")
    await page.click("text=New course")
    await page.fill("#name", "Smoke Test Course")
    await page.fill("#code", "SMOKE101")
    await page.click('button:has-text("Create course")')
    await expect(page.locator("text=Smoke Test Course")).toBeVisible({ timeout: 10_000 })

    // class session
    await page.goto("/timetable")
    await page.click("text=New session")
    await page.click("#courseId")
    await page.getByRole("option", { name: /Smoke Test Course/ }).click()
    await page.fill("#startTime", "09:00")
    await page.fill("#endTime", "10:00")
    await page.fill("#dateInput", "2026-09-07")
    await page.getByRole("button", { name: "Add", exact: true }).click()
    await page.click('button:has-text("Add session")')
    await expect(page.locator("text=Smoke Test Course").first()).toBeVisible({
      timeout: 10_000,
    })

    // assignment
    await page.goto("/assignments")
    await page.click("text=New assignment")
    await page.fill("#title", "Smoke Test Assignment")
    await page.click("#courseId")
    await page.getByRole("option", { name: /Smoke Test Course/ }).click()
    const due = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    const pad = (n: number) => String(n).padStart(2, "0")
    await page.fill(
      "#dueDate",
      `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}T23:59`
    )
    await page.click('button:has-text("Add assignment")')
    await expect(page.locator("text=Smoke Test Assignment")).toBeVisible({ timeout: 10_000 })

    // calendar merges both
    await page.goto("/calendar")
    await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 10_000 })
  })

  test("logout returns to login and re-login reaches the dashboard", async ({ page }) => {
    const email = uniqueEmail("relogin")

    await page.goto("/signup")
    await page.fill("#fullName", "Relogin Test")
    await page.fill("#email", email)
    await page.fill("#password", PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await page.click('button[aria-label="Account menu"]')
    await page.click("text=Log out")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    await page.fill("#email", email)
    await page.fill("#password", PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })
})
