import { test, expect } from "@playwright/test"

// One-off script used to record a feature walkthrough video for the README.
// Not part of the regression suite — it's excluded from the default test
// run (see playwright.config.ts testIgnore) and only run manually.
test.use({ video: "on", viewport: { width: 1280, height: 800 } })

const SCRATCH =
  "C:\\Users\\kelly\\AppData\\Local\\Temp\\claude\\d--Programming-Projects-StudyPlanix\\21048117-8810-4e36-be03-bd25e2c22981\\scratchpad"
const TIMETABLE_PDF = `${SCRATCH}\\test-timetable.pdf`
const QUIZ_SOURCE_PDF = `${SCRATCH}\\test-quiz-source.pdf`

function uniqueEmail(tag: string) {
  return `studyplanix-${tag}-${Date.now()}@mailinator.com`
}

const PASSWORD = "DemoRecord123!"

test("Full feature walkthrough (recording)", async ({ page }) => {
  test.setTimeout(6 * 60 * 1000)

  const t0 = Date.now()
  const mark = (label: string) => {
    console.log(`MARK ${label} ${((Date.now() - t0) / 1000).toFixed(1)}`)
  }

  const email = uniqueEmail("demo")

  await page.goto("/signup")
  await page.fill("#fullName", "Demo User")
  await page.fill("#email", email)
  await page.fill("#password", PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  mark("dashboard:start")
  await page.waitForTimeout(2500)
  mark("dashboard:end")

  // Courses
  mark("courses:start")
  await page.goto("/courses")
  await page.click("text=New course")
  await page.fill("#name", "Data Structures")
  await page.fill("#code", "CS201")
  await page.fill("#term", "Fall 2025")
  await page.fill("#credits", "3")
  await page.click("#grade")
  await page.getByRole("option", { name: "B", exact: true }).click()
  await page.click('button:has-text("Create course")')
  await expect(page.locator("text=Data Structures")).toBeVisible({ timeout: 10_000 })

  await page.click("text=New course")
  await page.fill("#name", "Calculus I")
  await page.fill("#code", "MA101")
  await page.fill("#term", "Spring 2026")
  await page.fill("#credits", "4")
  await page.click("#grade")
  await page.getByRole("option", { name: "A", exact: true }).click()
  await page.click('button:has-text("Create course")')
  await expect(page.locator("text=Calculus I")).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(1000)
  mark("courses:end")

  // Timetable
  mark("timetable:start")
  await page.goto("/timetable")
  await page.click("text=New session")
  await page.click("#courseId")
  await page.getByRole("option", { name: /Data Structures/ }).click()
  await page.fill("#startTime", "09:00")
  await page.fill("#endTime", "10:00")
  await page.fill("#dateInput", "2026-09-07")
  await page.getByRole("button", { name: "Add", exact: true }).click()
  await page.click('button:has-text("Add session")')
  await expect(page.locator("text=Data Structures").first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(1000)
  mark("timetable:end")

  // PDF timetable import (AI)
  mark("pdfimport:start")
  await page.goto("/timetable/import")
  await page.locator('input[type="file"]').setInputFiles(TIMETABLE_PDF)
  await expect(page.locator("table")).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await page.click('button:has-text("Confirm import")')
  await expect(page).toHaveURL(/\/timetable$/, { timeout: 15_000 })
  await page.waitForTimeout(1000)
  mark("pdfimport:end")

  // Assignments
  mark("assignments:start")
  await page.goto("/assignments")
  await page.click("text=New assignment")
  await page.fill("#title", "Problem Set 3")
  await page.click("#courseId")
  await page.getByRole("option", { name: /Data Structures/ }).click()
  await page.fill("#dueDate", "2026-09-15T23:59")
  await page.click('button:has-text("Add assignment")')
  await expect(page.locator("text=Problem Set 3")).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(1000)
  mark("assignments:end")

  // Calendar
  mark("calendar:start")
  await page.goto("/calendar")
  await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(2500)
  mark("calendar:end")

  // Notes
  mark("notes:start")
  await page.goto("/notes")
  await page.click("text=New note")
  await page.fill('input[placeholder="Note title"]', "Chapter 3 Summary")
  await page.click(".ProseMirror")
  await page.keyboard.type(
    "Big-O notation describes the upper bound of an algorithm's growth rate."
  )
  await page.click('button:has-text("Save")')
  await page.waitForTimeout(1500)
  mark("notes:end")

  // Quiz generator (AI)
  mark("quiz:start")
  await page.goto("/quizzes")
  await page.locator('input[type="file"]').setInputFiles(QUIZ_SOURCE_PDF)
  await expect(page).toHaveURL(/\/quizzes\/[0-9a-f-]+$/, { timeout: 30_000 })
  await page.waitForTimeout(1000)
  const quizQuestions = page.locator('[data-testid="quiz-question"]')
  const quizCount = Math.min(3, await quizQuestions.count())
  for (let i = 0; i < quizCount; i++) {
    const card = quizQuestions.nth(i)
    const optionButtons = card.locator("button")
    if ((await optionButtons.count()) > 0) {
      await optionButtons.first().click()
    } else {
      await card.locator("textarea").fill("A demo answer.")
    }
    await page.waitForTimeout(300)
  }
  mark("quiz:end")

  // Flashcard generator (AI)
  mark("flashcards:start")
  await page.goto("/flashcards")
  await page.locator('input[type="file"]').setInputFiles(QUIZ_SOURCE_PDF)
  await expect(page).toHaveURL(/\/flashcards\/[0-9a-f-]+$/, { timeout: 30_000 })
  const flashcards = page.locator('[data-testid="flashcard"]')
  await expect(flashcards.first()).toBeVisible({ timeout: 10_000 })
  const demoCardCount = Math.min(3, await flashcards.count())
  for (let i = 0; i < demoCardCount; i++) {
    await flashcards.nth(i).click()
    await page.waitForTimeout(700)
  }
  mark("flashcards:end")

  // Pomodoro
  mark("pomodoro:start")
  await page.goto("/pomodoro")
  await page.fill("#focusMinutes", "1")
  await page.click('button:has-text("Start")')
  await page.waitForTimeout(65_000)
  mark("pomodoro:end")

  // AI Study Plan
  mark("studyplan:start")
  await page.goto("/study-plan")
  await page.click('button:has-text("Generate study plan")')
  await expect(page.locator("text=No study sessions planned yet")).not.toBeVisible({
    timeout: 30_000,
  })
  await page.waitForTimeout(1500)
  mark("studyplan:end")

  // GPA Tracker
  mark("gpa:start")
  await page.goto("/gpa-tracker")
  await expect(page.locator("text=Cumulative GPA")).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(2500)
  mark("gpa:end")

  // Study Analytics
  mark("analytics:start")
  await page.goto("/study-analytics")
  await page.waitForTimeout(2500)
  mark("analytics:end")

  mark("done")
})
