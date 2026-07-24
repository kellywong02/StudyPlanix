import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  // demo.spec.ts is a one-off recording script for README assets, not part
  // of the regression suite — it's slow, costs real OpenAI API calls, and
  // is only ever run manually via `npx playwright test demo.spec.ts`.
  testIgnore: "**/demo.spec.ts",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
