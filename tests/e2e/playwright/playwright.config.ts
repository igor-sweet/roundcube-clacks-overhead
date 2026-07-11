import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  // Every spec file talks to the same shared GreenMail mailbox and
  // Roundcube backend (by design - see tests/e2e/README.md "Why one
  // mailbox is enough"), so running files in parallel risks one test's
  // message-list click racing another's. Unique nonced subjects avoid
  // ambiguous element matches, but there's no benefit to parallelizing
  // a suite this size against a single external stateful system anyway.
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.ROUNDCUBE_BASE_URL || 'http://localhost:8080',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
