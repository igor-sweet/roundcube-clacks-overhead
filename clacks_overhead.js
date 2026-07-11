/**
 * Clacks Overhead — animated 2×3 panel display
 *
 * Encodes each character as 6-bit ASCII (lower 6 bits),
 * mapping to a 2×3 grid of shutters (bit 5 = top-left, bit 0 = bottom-right).
 * Animates through each character of the header value.
 *
 * Each character is followed by a brief blank pulse before the next one.
 * Without it, two identical consecutive characters (e.g. the "rr" in
 * "Terry" or "tt" in "Pratchett") would render the exact same panel
 * pattern back-to-back and look like the animation had simply frozen,
 * rather than having advanced to a second, separate letter.
 */

if (window.rcmail) {
    rcmail.addEventListener('init', function () {
        const value = rcmail.env.clacks_overhead_value;
        if (!value) return;

        const chars = value.split('');
        let index = 0;

        const CHAR_DURATION_MS  = 850;
        const BLANK_DURATION_MS = 150;

        function showChar(ch) {
            const code = ch.charCodeAt(0) & 0x3F;
            const text = ch === ' ' ? '·' : ch;

            document.querySelectorAll('.clacks-overhead').forEach(function (widget) {
                const panels = widget.querySelectorAll('.clacks-panel');
                const label  = widget.querySelector('.clacks-label');

                if (label) label.textContent = text;

                panels.forEach(function (panel, i) {
                    const bit = 5 - i;
                    panel.classList.toggle('on', ((code >> bit) & 1) === 1);
                });
            });
        }

        function showBlank() {
            document.querySelectorAll('.clacks-overhead').forEach(function (widget) {
                const panels = widget.querySelectorAll('.clacks-panel');
                const label  = widget.querySelector('.clacks-label');

                if (label) label.textContent = '';
                panels.forEach(function (panel) {
                    panel.classList.remove('on');
                });
            });
        }

        function tick() {
            showChar(chars[index]);
            index = (index + 1) % chars.length;

            setTimeout(function () {
                showBlank();
                setTimeout(tick, BLANK_DURATION_MS);
            }, CHAR_DURATION_MS);
        }

        tick();
    });
}