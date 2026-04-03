import { defineConfig, devices } from 'playwright/test';

export default defineConfig({
  testDir: './pw-tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [['list']],
  use: {
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: 'https://adayogrenciler.nny.edu.tr',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
