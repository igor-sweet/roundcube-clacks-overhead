import { test, expect, type Page, type FrameLocator, type Locator } from '@playwright/test';
import { login } from '../helpers/login';
import { injectFixture } from '../helpers/mail-fixtures';

const TEST_USER = process.env.TEST_USER || 'tester@example.test';
const TEST_PASS = process.env.TEST_PASS || 'testpass';

// Mirrors the constants in clacks_overhead.js. Deliberately duplicated
// rather than imported - this test exists to catch the *rendered*
// animation diverging from the source, so it needs its own independent
// expectation of what these values are, not a shared one that could
// drift alongside a bug.
const OVERHEAD_START = [0b110000, 0b000011];
const OVERHEAD_END = [0b000011, 0b110000];
const END = 0b110011;
const G = 0b110100;
const N = 0b011011;
const U = 0b000111;
const CHAR_DURATION_MS = 1750;
const BLANK_DURATION_MS = 250;
const LOOP_PAUSE_MS = 10000;

/**
 * See incoming.spec.ts for why this goes through #messagecontframe.
 */
async function openMessage(page: Page, subject: string): Promise<FrameLocator> {
  const row = page.locator('#messagelist tr.message', { hasText: subject });
  await row.locator('td.subject a').click();

  const frame = page.frameLocator('#messagecontframe');
  await frame.locator('#message-header').waitFor({ state: 'visible' });
  return frame;
}

/** Reads the currently displayed panel pattern + label back out of the DOM. */
async function readPanelState(widget: Locator): Promise<{ pattern: number; label: string }> {
  return widget.evaluate((el) => {
    const panels = Array.from(el.querySelectorAll('.clacks-panel'));
    let pattern = 0;
    panels.forEach((panel, i) => {
      if (panel.classList.contains('on')) pattern |= (1 << (5 - i));
    });
    const label = el.querySelector('.clacks-label')?.textContent ?? '';
    return { pattern, label };
  });
}

test.describe('incoming mail - Clacks Overhead animation', () => {
  test('a GNU-prefixed value is bracketed by control markers, then shows END before looping', async ({ page }, testInfo) => {
    // Real timers stay on through navigation/login/message-open: Roundcube/
    // Elastic's AJAX message preview needs its own real setTimeout/
    // requestAnimationFrame callbacks to render the iframe content, and
    // page.clock overrides those globally, not just the widget's - pausing
    // this early hangs openMessage() until the 30s test timeout. Manual
    // time control only starts at pauseAt() below, once the page and the
    // widget have both loaded.
    //
    // Every manual time advance below uses runFor(), not fastForward():
    // the widget's tick() chains a new setTimeout from inside each
    // callback, and fastForward() only fires due timers once per call, not
    // ones (re-)scheduled during that same call. runFor() processes each
    // chained timer in turn. Without either, actually observing the END
    // marker and the loop restart would mean waiting out the real ~58s
    // animation cycle (23 message frames + END + a 10s pause) on every CI
    // run.
    await page.clock.install();

    const { subject, value } = injectFixture('positive'); // X-Clacks-Overhead: GNU Terry Pratchett
    await login(page, TEST_USER, TEST_PASS);
    const frame = await openMessage(page, subject);

    const widget = frame.locator('.clacks-overhead');
    await expect(widget).toHaveCount(1);

    // Pause now that the page and widget have loaded on real time, so
    // every time advance from here on is driven exclusively by our own
    // explicit runFor() calls below.
    //
    // pauseAt() needs a target >= the page's current (still naturally
    // advancing) clock. Date.now() is read directly from the page - not in
    // Node - plus a small forward buffer: enough to absorb the IPC
    // round-trip to pauseAt() actually landing in the page (without it,
    // that gap alone can put the target in the past by arrival time - see
    // playwright#33926, "Cannot fast-forward to the past"), but well under
    // the widget's shortest real interval (BLANK_DURATION_MS = 250ms) so
    // it can't fire a timer on its own while catching up.
    const pageNowBeforePause = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(pageNowBeforePause + 50);

    // Ground truth, not a guess: if this is ever anything other than 1,
    // the plugin's 'init' handler fired more than once for this widget,
    // which is the actual thing to fix (see clacks_overhead.js) - not a
    // clock/timing issue.
    const initCalls = await frame.locator('html').evaluate(() => (window as any).__clacksOverheadInitCalls);
    expect(initCalls, 'clacks_overhead.js init handler fired more than once for this widget').toBe(1);

    // tick() runs synchronously once as part of the plugin's init, so the
    // very first frame is already showing - no wait needed yet.
    let state = await readPanelState(widget);
    expect(state.pattern).toBe(OVERHEAD_START[0]);
    expect(state.label).toBe('');

    await testInfo.attach('animation-start-marker', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    // The first manual jump can't assume the full CHAR_DURATION_MS is
    // still left - real time may have passed between tick() starting (as
    // part of init, before we paused) and pauseAt() above (e.g. while
    // expect(widget).toHaveCount(1) was still polling). Sync exactly to
    // the widget's own recorded next-due timestamp instead of guessing.
    // Every runFor() after this one is safe to hardcode: once paused, no
    // more real time passes between our calls.
    const nextDueAt = await frame.locator('html').evaluate(
      () => (window as any).__clacksOverheadDebug.nextDueAt,
    );
    const pageNowAfterPause = await page.evaluate(() => Date.now());
    await page.clock.runFor(nextDueAt - pageNowAfterPause); // -> blank pulse
    state = await readPanelState(widget);
    expect(state.pattern).toBe(0);

    await page.clock.runFor(BLANK_DURATION_MS); // -> second start marker
    state = await readPanelState(widget);
    expect(state.pattern).toBe(OVERHEAD_START[1]);
    expect(state.label).toBe('');

    await page.clock.runFor(CHAR_DURATION_MS + BLANK_DURATION_MS); // -> 'G'
    state = await readPanelState(widget);
    expect(state.pattern).toBe(G);
    expect(state.label).toBe('G');

    await page.clock.runFor(CHAR_DURATION_MS + BLANK_DURATION_MS); // -> 'N'
    state = await readPanelState(widget);
    expect(state.pattern).toBe(N);
    expect(state.label).toBe('N');

    await page.clock.runFor(CHAR_DURATION_MS + BLANK_DURATION_MS); // -> 'U'
    state = await readPanelState(widget);
    expect(state.pattern).toBe(U);
    expect(state.label).toBe('U');

    await page.clock.runFor(CHAR_DURATION_MS + BLANK_DURATION_MS); // -> first end marker
    state = await readPanelState(widget);
    expect(state.pattern).toBe(OVERHEAD_END[0]);
    expect(state.label).toBe('');

    await page.clock.runFor(CHAR_DURATION_MS + BLANK_DURATION_MS); // -> second end marker
    state = await readPanelState(widget);
    expect(state.pattern).toBe(OVERHEAD_END[1]);
    expect(state.label).toBe('');

    // Everything after the 'GNU' prefix (here: " Terry Pratchett") renders
    // as ordinary message-frame pairs, not asserted character-by-character
    // here - that's what tests/unit-js/clacks_overhead.test.js is for,
    // against the actual encoding table, without needing a browser. This
    // test only needs to prove the real widget genuinely reaches END and
    // then loops.
    //
    // tailLength is derived from the actual injected value rather than
    // hardcoded, so this can't silently drift out of sync with what
    // fixtures/inject-mail.sh sends. One cycle per tail character walks
    // through all of them; one more cycle after that reaches the END
    // marker that follows the last one.
    const tailLength = value.slice(3).length;
    for (let i = 0; i < tailLength + 1; i++) {
      await page.clock.runFor(CHAR_DURATION_MS + BLANK_DURATION_MS);
    }
    state = await readPanelState(widget);
    expect(state.pattern).toBe(END);
    expect(state.label).toBe('');

    await testInfo.attach('animation-end-marker', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    // END is shown for CHAR_DURATION_MS, then it's blank for the 10s loop
    // pause - the message has run the length of the line and is being
    // turned around, not snapping straight back to the start.
    await page.clock.runFor(CHAR_DURATION_MS);
    state = await readPanelState(widget);
    expect(state.pattern).toBe(0);

    await page.clock.runFor(LOOP_PAUSE_MS);
    state = await readPanelState(widget);
    expect(state.pattern).toBe(OVERHEAD_START[0]);
    expect(state.label).toBe('');

    await testInfo.attach('animation-looped-back-to-start', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
});
