import fs from 'node:fs'
import path from 'node:path'

import { defineConfig, devices } from '@playwright/test'
import { chromium } from 'playwright'

// The orientation regression suite needs a WebGPU-capable browser: with no
// system Vulkan ICD, point the loader at the SwiftShader driver Playwright
// installs beside Chromium. A system ICD, when present, wins — the override
// would force software rendering over a real GPU. These args also switch
// WebGL2 to SwANGLE/Vulkan for the run, matching upstream noisemaker's
// shader-test browser.
function webgpuLaunchOptions() {
  const args = [
    '--enable-unsafe-webgpu',
    '--enable-features=Vulkan',
    '--use-angle=vulkan',
    '--disable-gpu-sandbox',
  ]
  const env = { ...process.env }
  const systemIcdDir = '/usr/share/vulkan/icd.d'
  const hasSystemIcd = fs.existsSync(systemIcdDir) && fs.readdirSync(systemIcdDir).length > 0
  if (!hasSystemIcd && !env.VK_ICD_FILENAMES && !env.VK_DRIVER_FILES) {
    const bundledIcd = path.join(path.dirname(chromium.executablePath()), 'vk_swiftshader_icd.json')
    if (fs.existsSync(bundledIcd)) {
      env.VK_ICD_FILENAMES = bundledIcd
      env.VK_DRIVER_FILES = bundledIcd
    }
  }
  return { args, env }
}

const orientationLaunch = webgpuLaunchOptions()

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
      testIgnore: /effect-orientation\.spec\.js/,
    },
    {
      name: 'chromium-orientation',
      testMatch: /effect-orientation\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        launchOptions: { args: orientationLaunch.args, env: orientationLaunch.env },
      },
    },
  ],
  webServer: {
    command: 'node test/browser/server.mjs',
    url: 'http://127.0.0.1:4173/test/browser/fixture.html',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
