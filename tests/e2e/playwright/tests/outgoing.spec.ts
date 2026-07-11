import { test, expect } from '@playwright/test';
import { login } from '../helpers/login';
import { fetchRawHeadersBySubject } from '../helpers/imap-client';

const TEST_USER = process.env.TEST_USER || 'tester@example.test';
const TEST_PASS = process.env.TEST_PASS || 'testpass';
const IMAP_HOST = process.env.GREENMAIL_IMAP_HOST || 'localhost';
const IMAP_PORT = Number(process.env.GREENMAIL_IMAP_PORT || 3143);

test.describe('outgoing mail - header injection', () => {
  test('a mail composed and sent through Roundcube carries X-Clacks-Overhead', async ({ page }) => {
    const subject = `Clacks E2E outgoing ${Date.now()}`;

    await login(page, TEST_USER, TEST_PASS);

    // Compose and send to ourselves - simplest single-mailbox setup, and
    // sufficient here since we only care about the header the plugin's
    // message_before_send hook adds, not routing between two accounts.
    await page.locator('#taskmenu a.compose').click();
    await page.locator('#compose-headers').waitFor({ state: 'visible' });

    // The `_to` field is a tag-style recipient input: the real <textarea
    // name="_to"> is visually hidden, and typing happens in a plain
    // <input> nested under #compose_to that gets converted into a
    // recipient "tag" on Enter/comma. Typing into the hidden textarea
    // directly would skip that conversion and the mail might not send.
    const toInput = page.locator('#compose_to input[type="text"]');
    await toInput.fill(TEST_USER);
    await toInput.press('Enter');

    await page.locator('#compose-subject').fill(subject);
    await page.locator('#composebody').fill('Body for the clacks_overhead outgoing E2E test.');

    // Button text is German ("Senden") in this instance's UI language, and
    // its numeric id (rcmbtn111) is an auto-incrementing counter that
    // shifts depending on how many buttons/plugins rendered before it -
    // not stable across environments. The semantic class is the safe bet.
    await page.locator('.formbuttons button.send').click();

    // Positive control: Roundcube returns to the message list on a
    // successful send. If sending is rejected client-side (e.g. an
    // invalid recipient address - Roundcube's check_email() rejects
    // domains without a dot, which is exactly what tripped this test
    // before TEST_USER was switched to the .test domain), the compose
    // view just stays open instead, and the IMAP lookup below would
    // otherwise fail with a much less obvious "message not found" error.
    await page.locator('#messagelist').waitFor({ state: 'visible', timeout: 15_000 });

    const rawHeaders = await fetchRawHeadersBySubject(
      IMAP_HOST,
      IMAP_PORT,
      TEST_USER,
      TEST_PASS,
      subject,
    );

    // This is the one assertion in the whole suite that actually proves
    // add_clacks_overhead() ran on the *real* outgoing path - the unit
    // tests only prove the hook logic is correct in isolation.
    expect(rawHeaders).toMatch(/X-Clacks-Overhead:\s*GNU Terry Pratchett/i);
  });
});
