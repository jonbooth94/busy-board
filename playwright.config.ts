import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

// Runs against the production build served by `vite preview` (run `npm run build` first).
export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: CI ? 1 : 0,
  workers: CI ? 1 : 2,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4174/busy-board/',
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    // iPad 10th/11th gen saved to the home screen: 1180 x 820 points, Safari's engine.
    { name: 'ipad', use: { ...devices['iPad (gen 11) landscape'], viewport: { width: 1180, height: 820 } } },
    // A smaller Android tablet in Chrome.
    { name: 'galaxy-tab-s9', use: { ...devices['Galaxy Tab S9 landscape'] } },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4174/busy-board/',
    reuseExistingServer: !CI,
  },
});
