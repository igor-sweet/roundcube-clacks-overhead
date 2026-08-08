/**
 * Clacks Overhead — animated 2×3 panel display
/**
 * Clacks Overhead — animated 2×3 panel display
 *
 * Real semaphore encoding (verified collision-free against the actual
 * x-clacks-overhead browser extension table, not the ad-hoc
 * `charCodeAt(0) & 0x3F` bit-mask this used to use, which collided on
 * 20 of the 74 characters the sanitizer allows - e.g. "p" and "0", or
 * "a" and "!", produced identical panel patterns).
 *
 * Bit order per character: R1C1 R1C2 R2C1 R2C2 R3C1 R3C2 (2x3 grid,
 * read left-to-right, top-to-bottom). Panel i in the DOM corresponds
 * to bit (5 - i), matching the original extension's on/off table for
 * A-Z, SPACE and END. Digits and punctuation are our own extension,
 * assigned from the 35 states the letter table leaves unused - see
 * README.md for the full table and how the free/used split was
 * verified.
 *
 * GNU control-code framing: the real Discworld "Overhead" reserves a
 * GNU prefix for network-operator instructions (G/N/U), distinct from
 * an ordinary message. Nothing in the visual grid distinguishes "GNU"
 * as three letters from "GNU" as those three commands - so when a
 * value starts with the literal prefix "GNU", we bracket it with a
 * pair of reserved marker patterns (not used by any letter/digit/
 * punctuation) before and after, mirrored start-to-end. This needs no
 * new letter patterns for G/N/U themselves - they keep their normal
 * letter panels - only the bracket is new.
 *
 * Each frame is followed by a brief blank pulse before the next one.
 * Without it, two identical consecutive frames (e.g. the "rr" in
 * "Terry" or "tt" in "Pratchett") would render the exact same panel
 * pattern back-to-back and look like the animation had simply frozen,
 * rather than having advanced to a second, separate frame.
 *
 * After the last frame, the display shows the reserved END pattern
 * once, then pauses for LOOP_PAUSE_MS before starting over from the
 * first frame - the message has run the length of the line and is
 * being turned around, rather than snapping straight back to the
 * start.
 */

// Bit order: R1C1 R1C2 R2C1 R2C2 R3C1 R3C2
const PANEL_ENCODING = {
    A: 0b001001, B: 0b000110, C: 0b001100, D: 0b100010,
    E: 0b110010, F: 0b111000, G: 0b110100, H: 0b100011,
    I: 0b101010, J: 0b010111, K: 0b011001, L: 0b101011,
    M: 0b101111, N: 0b011011, O: 0b111100, P: 0b111110,
    Q: 0b110110, R: 0b111010, S: 0b011110, T: 0b110101,
    U: 0b000111, V: 0b001011, W: 0b111001, X: 0b100110,
    Y: 0b100101, Z: 0b101101,
    ' ': 0b000010,

    // Digits and punctuation: our extension of the original A-Z-only
    // table, assigned from the 35 states the letters leave free (see
    // README.md "Semaphore encoding" for the collision check).
    '0': 0b000001, '1': 0b000100, '2': 0b000101, '3': 0b001000,
    '4': 0b001010, '5': 0b001101, '6': 0b001110, '7': 0b001111,
    '8': 0b010000, '9': 0b010001,
    '.': 0b010010, ',': 0b010011, ';': 0b010100, ':': 0b010101,
    '!': 0b010110, "'": 0b011000, '"': 0b011010, '(': 0b011100,
    ')': 0b011101, '&': 0b011111, '-': 0b100000,
};

const BLANK = 0b000000;
const END   = 0b110011; // shown once after the message, before the loop pause

// Overhead bracket: two reserved states, unused by any letter, digit or
// punctuation above, that frame the GNU control code (see README.md's
// "GNU control-code marker" section) the way the Discworld "Overhead"
// frames a customer message - separate from it, not part of it. Mirrored
// start-to-end on purpose - it reads as an opening/closing frame around
// the block, and OVERHEAD_START[0] | OVERHEAD_START[1] === END
// (0b110011), which is a tidy coincidence worth keeping rather than a
// requirement.
const OVERHEAD_START = [0b110000, 0b000011];
const OVERHEAD_END   = [0b000011, 0b110000];

function encodePattern(ch) {
    const key = /[a-z]/.test(ch) ? ch.toUpperCase() : ch;
    if (Object.prototype.hasOwnProperty.call(PANEL_ENCODING, key)) {
        return PANEL_ENCODING[key];
    }
    // Shouldn't happen - sanitize_clacks_value() on the PHP side
    // already restricts the value to exactly this character set - but
    // fail safe to a blank panel rather than showing something wrong.
    return BLANK;
}

function buildFrames(value) {
    const frames = [];
    const pushChar = (ch) => frames.push({
        pattern: encodePattern(ch),
        label: ch === ' ' ? '\u00b7' : ch,
    });
    const pushMarker = (pattern) => frames.push({ pattern, label: '' });

    const isGnuPrefixed = value.slice(0, 3).toUpperCase() === 'GNU';

    if (isGnuPrefixed) {
        OVERHEAD_START.forEach(pushMarker);
        value.slice(0, 3).split('').forEach(pushChar);
        OVERHEAD_END.forEach(pushMarker);
        value.slice(3).split('').forEach(pushChar);
    } else {
        value.split('').forEach(pushChar);
    }

    return frames;
}

if (typeof window !== 'undefined' && window.rcmail) {
    rcmail.addEventListener('init', function () {
        // Debug/test hook only - not used by the widget itself. Counts
        // every 'init' firing (even ones that return early below), so
        // tests can check whether this ran more than once instead of
        // guessing from rendered DOM state.
        window.__clacksOverheadInitCalls = (window.__clacksOverheadInitCalls || 0) + 1;

        const value = rcmail.env.clacks_overhead_value;
        if (!value) return;

        const widgets = document.querySelectorAll('.clacks-overhead');
        if (!widgets.length) return;

        // Guard against 'init' firing more than once for the same
        // widget (observed in practice: Elastic can both AJAX-preview a
        // selected row and navigate the iframe on the subject link
        // click, and either path can re-run this script against a
        // document/DOM that's already animating). Without this, a
        // second call would start its own, independently-timed tick()
        // loop writing to the same panels, and the two loops would
        // interleave and corrupt what's shown.
        if (widgets[0].dataset.clacksAnimating === '1') return;
        widgets.forEach(function (widget) { widget.dataset.clacksAnimating = '1'; });

        const frames = buildFrames(value);

        const CHAR_DURATION_MS = 1750;
        const BLANK_DURATION_MS = 250;
        // The line has reached its end and the message is being turned
        // around to run again - pause here before it does, rather than
        // snapping straight back to the start.
        const LOOP_PAUSE_MS = 10000;

        // One playlist entry per step: message frames, each followed by
        // a blank pulse, then a trailing END marker and a long pause
        // before the whole thing repeats.
        const playlist = [];
        frames.forEach(function (frame) {
            playlist.push({ pattern: frame.pattern, label: frame.label, duration: CHAR_DURATION_MS });
            playlist.push({ pattern: BLANK, label: '', duration: BLANK_DURATION_MS });
        });
        playlist.push({ pattern: END, label: '', duration: CHAR_DURATION_MS });
        playlist.push({ pattern: BLANK, label: '', duration: LOOP_PAUSE_MS });

        function showStep(step) {
            document.querySelectorAll('.clacks-overhead').forEach(function (widget) {
                const panels = widget.querySelectorAll('.clacks-panel');
                const label  = widget.querySelector('.clacks-label');

                if (label) label.textContent = step.label;

                panels.forEach(function (panel, i) {
                    const bit = 5 - i;
                    panel.classList.toggle('on', ((step.pattern >> bit) & 1) === 1);
                });
            });
        }

        let index = 0;
        // Debug/test hook only: absolute Date.now()-based timestamp of the
        // next scheduled tick(), recorded at schedule time. Lets a test
        // synchronize its first Playwright clock.runFor() call to the
        // *actual* remaining time until the next step, instead of assuming
        // a full CHAR_DURATION_MS/BLANK_DURATION_MS is still left - which
        // isn't true once any real wall-clock time has already elapsed
        // between this loop starting and the test taking manual control of
        // the clock (e.g. while Playwright is still polling for the widget
        // to appear in the DOM).
        let nextDueAt = null;
        function tick() {
            const step = playlist[index];
            showStep(step);
            index = (index + 1) % playlist.length;
            nextDueAt = Date.now() + step.duration;
            setTimeout(tick, step.duration);
        }

        // Debug/test hook only, read via a property getter so it's always
        // current. Only nextDueAt is exposed: index/playlistLength were
        // useful for earlier manual diagnosis but aren't read by anything
        // anymore - no reason to keep shipping them (this file has no
        // build/minify step, see scripts/build-release.sh, so whatever is
        // here goes to every real user's browser as-is).
        window.__clacksOverheadDebug = {
            get nextDueAt() { return nextDueAt; },
        };

        tick();
    });
}

// Node-only: lets tests/unit-js/ require() this exact shipped file and
// exercise the pure encoding/frame-building logic directly, without a
// browser or DOM. `module` doesn't exist in the browser, so this is a
// no-op there.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PANEL_ENCODING,
        BLANK,
        END,
        OVERHEAD_START,
        OVERHEAD_END,
        encodePattern,
        buildFrames,
    };
}