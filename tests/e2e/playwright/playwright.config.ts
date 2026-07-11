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
  // 'github' annotates PR checks, 'list' gives readable terminal output -
  // neither one writes an HTML report to disk. 'html' is what actually
  // creates the playwright-report/ directory the e2e.yml workflow uploads
  // as an artifact; without it the upload step finds nothing.
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL: process.env.ROUNDCUBE_BASE_URL || 'http://localhost:8080',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
