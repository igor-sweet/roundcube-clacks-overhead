import type { Page } from '@playwright/test';

/**
 * Logs into Roundcube's Elastic skin (the docker image default).
 * Selector IDs (#rcmloginuser etc.) are stable across Roundcube's
 * supported skins/versions - this is the same login form markup used
 * in Roundcube's own core JS.
 */
export async function login(page: Page, user: string, pass: string): Promise<void> {
  await page.goto('/');
  await page.locator('#rcmloginuser').fill(user);
  await page.locator('#rcmloginpwd').fill(pass);
  await page.locator('#rcmloginsubmit').click();

  // Elastic's mailbox view lands on the message list; wait for it rather
  // than a fixed timeout so this stays reliable across slower CI runners.
  // Confirmed DOM: <div id="messagelist-content"><table id="messagelist">.
  await page.locator('#messagelist').waitFor({ state: 'visible' });
}
