'use strict';

// Uses Node's built-in test runner (node:test) rather than adding a new
// dependency like Jest - the plugin's DOM-facing code is already covered
// by the Playwright E2E suite, so this only needs to check the pure,
// DOM-free encoding logic in isolation: PANEL_ENCODING, encodePattern(),
// and buildFrames(). It requires clacks_overhead.js directly (the actual
// shipped file, not a copy) - see the `module.exports` guard at the
// bottom of that file.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
    PANEL_ENCODING,
    BLANK,
    END,
    OVERHEAD_START,
    OVERHEAD_END,
    encodePattern,
    buildFrames,
} = require(path.join('..', '..', 'clacks_overhead.js'));

test('every character pattern is unique - no two characters render the same panel', () => {
    const seen = new Map();
    for (const [ch, pattern] of Object.entries(PANEL_ENCODING)) {
        assert.ok(
            !seen.has(pattern),
            `'${ch}' (${pattern}) collides with '${seen.get(pattern)}' - ` +
            'this is exactly the bug the old charCodeAt(0) & 0x3F encoding had'
        );
        seen.set(pattern, ch);
    }
    // 26 letters + 10 digits + 1 space + 11 punctuation marks.
    assert.equal(Object.keys(PANEL_ENCODING).length, 48);
});

test('BLANK, END, and the overhead brackets do not collide with any character', () => {
    const charPatterns = new Set(Object.values(PANEL_ENCODING));
    for (const reserved of [BLANK, END, ...OVERHEAD_START, ...OVERHEAD_END]) {
        assert.ok(!charPatterns.has(reserved), `reserved pattern ${reserved} collides with a character`);
    }
});

test('the overhead brackets are a mirrored pair, and END is their bitwise OR', () => {
    assert.deepEqual(OVERHEAD_END, [...OVERHEAD_START].reverse());
    // eslint-disable-next-line no-bitwise
    assert.equal(OVERHEAD_START[0] | OVERHEAD_START[1], END);
});

test('encodePattern() is case-insensitive for letters, and passes digits/punctuation through as-is', () => {
    assert.equal(encodePattern('g'), encodePattern('G'));
    assert.equal(encodePattern('a'), PANEL_ENCODING.A);
    assert.equal(encodePattern('5'), PANEL_ENCODING['5']);
    assert.equal(encodePattern('!'), PANEL_ENCODING['!']);
    assert.equal(encodePattern(' '), PANEL_ENCODING[' ']);
});

test('encodePattern() falls back to BLANK for anything outside the allow-list', () => {
    // Shouldn't happen in practice - sanitize_clacks_value() on the PHP
    // side already restricts the value to this exact character set - but
    // must fail safe rather than throw or render garbage.
    assert.equal(encodePattern('€'), BLANK);
    assert.equal(encodePattern('\n'), BLANK);
});

test('buildFrames() brackets a GNU-prefixed value with mirrored overhead markers', () => {
    const frames = buildFrames('GNU Terry Pratchett');

    const patterns = frames.map((f) => f.pattern);
    const labels = frames.map((f) => f.label);

    assert.deepEqual(patterns.slice(0, 7), [
        OVERHEAD_START[0], OVERHEAD_START[1],
        PANEL_ENCODING.G, PANEL_ENCODING.N, PANEL_ENCODING.U,
        OVERHEAD_END[0], OVERHEAD_END[1],
    ]);
    // G/N/U keep their normal letter labels - only the surrounding
    // marker frames are unlabeled.
    assert.deepEqual(labels.slice(0, 7), ['', '', 'G', 'N', 'U', '', '']);

    // Everything after the prefix is the ordinary rest of the message.
    assert.equal(frames.length, 7 + ' Terry Pratchett'.length);
    assert.equal(labels[7], '\u00b7'); // the space right after "GNU"
    assert.equal(labels[8], 'T');
});

test('buildFrames() is case-insensitive when detecting the GNU prefix', () => {
    const frames = buildFrames('gnu something');
    assert.equal(frames[0].pattern, OVERHEAD_START[0]);
    // The letters keep their *original* case in the label even though
    // detection is case-insensitive and the panel pattern is upper-cased.
    assert.equal(frames[2].label, 'g');
    assert.equal(frames[2].pattern, PANEL_ENCODING.G);
});

test('buildFrames() does NOT bracket a value that merely contains "GNU" later on', () => {
    const frames = buildFrames('Value with GNU inside');
    assert.notEqual(frames[0].pattern, OVERHEAD_START[0]);
    assert.equal(frames.length, 'Value with GNU inside'.length);
});

test('buildFrames() does not bracket a value shorter than the GNU prefix', () => {
    const frames = buildFrames('GN');
    assert.equal(frames.length, 2);
    assert.equal(frames[0].pattern, PANEL_ENCODING.G);
});
