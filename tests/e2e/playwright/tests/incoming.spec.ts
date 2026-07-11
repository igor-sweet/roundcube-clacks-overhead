import { test, expect, type Page, type FrameLocator } from '@playwright/test';
import { login } from '../helpers/login';
import { injectFixture } from '../helpers/mail-fixtures';
import { fetchRawHeadersBySubject } from '../helpers/imap-client';

const TEST_USER = process.env.TEST_USER || 'tester@example.test';
const TEST_PASS = process.env.TEST_PASS || 'testpass';
const IMAP_HOST = process.env.GREENMAIL_IMAP_HOST || 'localhost';
const IMAP_PORT = Number(process.env.GREENMAIL_IMAP_PORT || 3143);

// All tests in this file share one GreenMail mailbox and one Roundcube
// session. injectFixture() gives every mail a unique (nonced) subject so
// tests can't match each other's rows, and playwright.config.ts pins
// workers to 1 so runs across every spec file stay strictly sequential -
// that alone is enough to avoid cross-test races without also adopting
// describe.configure({mode:'serial'})'s "skip the rest of the file after
// one failure" behaviour, which would hide useful diagnostic info since
// these fixture tests are independent of each other.

/**
 * Opens the message with the given subject from the message list and
 * returns a FrameLocator scoped to the message preview iframe.
 *
 * Confirmed DOM:
 * - Rows are <tr class="message" id="rcmrowNNN"> inside #messagelist,
 *   but the row itself has no click handler - the actual navigable
 *   element is the <a href="...&_action=show..."> nested inside
 *   td.subject.
 * - The preview itself (#message-header, #message-content, and our
 *   .clacks-overhead widget) renders inside
 *   <iframe name="messagecontframe" id="messagecontframe">, NOT in the
 *   top-level document. This tripped us up for a while - the click
 *   "worked" (no error), but #message-header never appeared because we
 *   were looking for it in the wrong document entirely.
 */
async function openMessage(page: Page, subject: string): Promise<FrameLocator> {
  const row = page.locator('#messagelist tr.message', { hasText: subject });
  await row.locator('td.subject a').click();

  const frame = page.frameLocator('#messagecontframe');
  await frame.locator('#message-header').waitFor({ state: 'visible' });
  return frame;
}

test.describe('incoming mail - widget display', () => {
  test('mail WITHOUT the header shows no widget (negative test)', async ({ page }, testInfo) => {
    const subject = injectFixture('negative');
    await login(page, TEST_USER, TEST_PASS);
    const frame = await openMessage(page, subject);

    // Positive control: prove we actually opened *this* mail and the page
    // rendered normally, so the absence check below can't pass vacuously
    // (e.g. because navigation silently failed and nothing rendered at all).
    await expect(frame.locator('#message-header')).toContainText(subject);

    await expect(frame.locator('.clacks-overhead')).toHaveCount(0);

    // Documentation screenshot: expected behaviour with no header present.
    // Attached explicitly (not via the automatic only-on-failure setting)
    // so it shows up in the HTML report on a green run too.
    await testInfo.attach('no-widget-without-header', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    // Double-check at the IMAP/wire level: the widget being absent in the
    // UI could in principle also mean storage_init()/message_load() failed
    // to fetch a header that *was* actually there - which would look
    // identical in the UI but be a real bug. Confirming via raw source
    // that there's genuinely no X-Clacks-Overhead header rules that out.
    const rawHeaders = await fetchRawHeadersBySubject(
      IMAP_HOST,
      IMAP_PORT,
      TEST_USER,
      TEST_PASS,
      subject,
    );
    expect(rawHeaders).not.toMatch(/X-Clacks-Overhead/i);
  });

  test('mail WITH the header shows the widget (positive test)', async ({ page }, testInfo) => {
    const subject = injectFixture('positive');
    await login(page, TEST_USER, TEST_PASS);
    const frame = await openMessage(page, subject);

    const widget = frame.locator('.clacks-overhead');
    await expect(widget).toHaveCount(1);
    await expect(widget).toHaveAttribute('title', /GNU Terry Pratchett/);

    // Documentation screenshot: expected behaviour with the header
    // present and the widget rendered.
    await testInfo.attach('widget-visible-with-header', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });

  test('whitespace-only header is now correctly treated as absent (sanitizer fix)', async ({ page }) => {
    const subject = injectFixture('whitespace');
    await login(page, TEST_USER, TEST_PASS);
    const frame = await openMessage(page, subject);

    // Behaviour changed with clacks_overhead.php's allow-list sanitizer:
    // whitespace trims down to an empty string before it's ever stored,
    // so this is no longer shown. Mirrors
    // tests/unit/ClacksOverheadTest.php::testMessageSummaryTreatsWhitespaceOnlyHeaderAsAbsent -
    // if that ever changes, update both together.
    await expect(frame.locator('.clacks-overhead')).toHaveCount(0);
  });

  test('a quote/tag-breakout header value cannot inject a live DOM element', async ({ page }) => {
    const subject = injectFixture('xss');
    await login(page, TEST_USER, TEST_PASS);
    const frame = await openMessage(page, subject);

    // The payload is `"><img src=x onerror=window.__clacks_xss_fired=true>`.
    // In an HTML *attribute* context, a literal "<script>" is harmless
    // either way - only unescaped quotes/angle-brackets matter, because
    // they can break out of the attribute and inject a real element.
    // If the allow-list sanitizer AND htmlspecialchars() were both ever
    // removed, this would inject a live <img onerror> - and since that
    // would execute *inside the iframe's own window*, not the top page's,
    // we have to check the global there too.
    const xssFired = await frame.locator('#message-header').evaluate(() => (window as any).__clacks_xss_fired);
    expect(xssFired).toBeUndefined();
    await expect(frame.locator('img[src="x"]')).toHaveCount(0);

    // The widget itself should still render as a single, intact element -
    // proof the payload was neutralized (letters/digits survive the
    // allow-list, "<", ">", "=", "_" don't) rather than silently dropped.
    await expect(frame.locator('.clacks-overhead')).toHaveCount(1);
  });

  test('widget stays visible when toggling the header details view', async ({ page }, testInfo) => {
    const subject = injectFixture('positive');
    await login(page, TEST_USER, TEST_PASS);
    const frame = await openMessage(page, subject);

    // .clacks-overhead sits as a DOM sibling between .header-summary and
    // table.header-headers, outside whatever UI.headers_show() toggles -
    // so it should never disappear regardless of toggle state. This
    // guards against a future markup change accidentally nesting it
    // inside the toggled block.
    //
    // Deliberately not selecting by "a.headers-details" here: Roundcube
    // swaps the toggle link's label (and likely its class) between
    // "Details" and "Summary" depending on whether headers are currently
    // expanded - and that default state differs between a real browser
    // session and Playwright's headless viewport. The first link in
    // .header-links is always the toggle, whichever state it's in.
    const widget = frame.locator('.clacks-overhead');
    await expect(widget).toBeVisible();
    await testInfo.attach('widget-before-toggle', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    const toggleLink = frame.locator('.header-links a').first();
    await toggleLink.click();
    await expect(widget).toBeVisible();
    await testInfo.attach('widget-after-first-toggle', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    await toggleLink.click();
    await expect(widget).toBeVisible();
    await testInfo.attach('widget-after-second-toggle', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
});
