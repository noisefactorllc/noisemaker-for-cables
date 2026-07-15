import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  outputDir: 'test-results/browser',
  reporter: [
    ['line'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'node test/browser/server.mjs',
    url: 'http://127.0.0.1:4173/test/browser/fixture.html',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
