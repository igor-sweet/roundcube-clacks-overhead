/**
 * Clacks Overhead — animated 2×3 panel display
 *
 * Encodes each character as 6-bit ASCII (lower 6 bits),
 * mapping to a 2×3 grid of shutters (bit 5 = top-left, bit 0 = bottom-right).
 * Animates through each character of the header value.
 */

if (window.rcmail) {
    rcmail.addEventListener('init', function () {
        const value = rcmail.env.clacks_overhead_value;
        if (!value) return;

        const chars = value.split('');
        let index = 0;

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

        function tick() {
            showChar(chars[index]);
            index = (index + 1) % chars.length;
        }

        tick();
        setInterval(tick, 1000);
    });
}