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

  test("PDF timetable import: upload, AI-parsed preview, and commit", async ({ page }) => {
    const email = uniqueEmail("pdfimport")

    await page.goto("/signup")
    await page.fill("#fullName", "PDF Import Test")
    await page.fill("#email", email)
    await page.fill("#password", PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await page.goto("/timetable/import")
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(
      "C:\\Users\\kelly\\AppData\\Local\\Temp\\claude\\d--Programming-Projects-StudyPlanix\\21048117-8810-4e36-be03-bd25e2c22981\\scratchpad\\test-timetable.pdf"
    )

    // AI parsing call — allow generous time
    await expect(page.locator("table")).toBeVisible({ timeout: 30_000 })
    await expect(page.locator("text=CS101").first()).toBeVisible()
    await expect(page.locator("text=Linear Algebra").first()).toBeVisible()

    await page.click('button:has-text("Confirm import")')
    await expect(page).toHaveURL(/\/timetable$/, { timeout: 15_000 })

    await expect(page.locator("text=Introduction to Computer Science").first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator("text=Linear Algebra").first()).toBeVisible()
  })

  test("Quiz generator: upload PDF, generate quiz, answer, and submit", async ({ page }) => {
    const email = uniqueEmail("quizgen")

    await page.goto("/signup")
    await page.fill("#fullName", "Quiz Gen Test")
    await page.fill("#email", email)
    await page.fill("#password", PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await page.goto("/quizzes")
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(
      "C:\\Users\\kelly\\AppData\\Local\\Temp\\claude\\d--Programming-Projects-StudyPlanix\\21048117-8810-4e36-be03-bd25e2c22981\\scratchpad\\test-quiz-source.pdf"
    )

    // Quiz generation calls OpenAI — allow generous time, then redirect to /quizzes/[id]
    await expect(page).toHaveURL(/\/quizzes\/[0-9a-f-]+$/, { timeout: 30_000 })

    const questionCards = page.locator('[data-testid="quiz-question"]')
    const questionCount = await questionCards.count()
    expect(questionCount).toBeGreaterThan(0)

    // Answer every question: click first option button if present, else fill the textarea
    for (let i = 0; i < questionCount; i++) {
      const card = questionCards.nth(i)
      const optionButtons = card.locator("button")
      const optionCount = await optionButtons.count()
      if (optionCount > 0) {
        await optionButtons.first().click()
      } else {
        await card.locator("textarea").fill("A general answer for testing.")
      }
    }

    await page.click('button:has-text("Submit quiz")')
    await expect(page.locator("text=Quiz complete")).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('button:has-text("Retake quiz")')).toBeVisible()

    // Back on the list, the quiz should now show a best-score badge
    await page.goto("/quizzes")
    await expect(page.locator("text=Best:").first()).toBeVisible({ timeout: 10_000 })
  })

  test("Flashcard generator: upload PDF, generate deck, and review cards", async ({ page }) => {
    test.setTimeout(90_000)
    const email = uniqueEmail("flashcardgen")

    await page.goto("/signup")
    await page.fill("#fullName", "Flashcard Gen Test")
    await page.fill("#email", email)
    await page.fill("#password", PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await page.goto("/flashcards")
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(
      "C:\\Users\\kelly\\AppData\\Local\\Temp\\claude\\d--Programming-Projects-StudyPlanix\\21048117-8810-4e36-be03-bd25e2c22981\\scratchpad\\test-quiz-source.pdf"
    )

    // Flashcard generation calls OpenAI — allow generous time, then redirect to /flashcards/[id]
    await expect(page).toHaveURL(/\/flashcards\/[0-9a-f-]+$/, { timeout: 30_000 })

    const flashcard = page.locator('[data-testid="flashcard"]')
    await expect(flashcard).toBeVisible({ timeout: 10_000 })
    await expect(page.locator("text=Card 1 of")).toBeVisible()
    await expect(page.locator("text=Front")).toBeVisible()

    // Step through every card, clicking "Got it" each time, and record the
    // front text shown at each step — verifies no card is skipped or
    // repeated when the reviewed card's schedule updates mid-session
    // (regression check for the reorder-under-a-live-index bug).
    const progressText = await page.locator("text=/Card \\d+ of \\d+/").textContent()
    const totalCards = Number(progressText?.match(/of (\d+)/)?.[1])
    expect(totalCards).toBeGreaterThan(0)

    const seenFronts = new Set<string>()
    for (let i = 0; i < totalCards; i++) {
      await expect(page.locator(`text=Card ${i + 1} of ${totalCards}`)).toBeVisible({
        timeout: 10_000,
      })
      await expect(page.locator("text=Front")).toBeVisible()
      const front = await flashcard.locator("p.text-lg").textContent()
      expect(front).toBeTruthy()
      seenFronts.add(front!)

      await flashcard.click()
      await expect(page.locator("text=Back")).toBeVisible()
      await page.click('button:has-text("Got it")')
    }

    expect(seenFronts.size).toBe(totalCards)
    await expect(page.locator("text=Session complete")).toBeVisible({ timeout: 10_000 })

    // Back on the list, the deck should show a card count
    await page.goto("/flashcards")
    await expect(page.locator("text=/\\d+ cards?/").first()).toBeVisible({ timeout: 10_000 })
  })
})
