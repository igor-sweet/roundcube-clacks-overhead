<?php

/**
 * Plugin to add `X-Clacks-Overhead: GNU Terry Pratchett` as a header to
 * outgoing mail, and display an animated Clacks tower indicator when
 * receiving mail that carries the header.
 *
 * @version 0.5
 * @since 0.1
 * @see https://www.gnuterrypratchett.com/
 * @author Martin Porcheron
 * @author (modernization & display feature) igor-sweet
 */

class clacks_overhead extends rcube_plugin
{
    public $task = 'mail';

    /** @var string|null The X-Clacks-Overhead value of the current message */
    private ?string $clacks_value = null;

    public function init(): void
    {
        $this->add_hook('message_before_send', [$this, 'add_clacks_overhead']);

        $rcmail = rcmail::get_instance();

        if ($rcmail->action === 'show' || $rcmail->action === 'preview') {
            $this->add_hook('storage_init', [$this, 'storage_init']);
            $this->add_hook('message_load', [$this, 'message_load']);
            $this->add_hook('template_object_messagesummary', [$this, 'message_summary']);
        } elseif ($rcmail->action === '') {
            $this->add_hook('storage_init', [$this, 'storage_init']);
        }
    }

    public function add_clacks_overhead(array $args): array
    {
        $args['message']->headers(['X-Clacks-Overhead' => 'GNU Terry Pratchett'], true);
        return $args;
    }

    public function storage_init(array $args): array
    {
        $existing = $args['fetch_headers'] ?? '';

        // Guard against duplicating the header if something else already
        // requested it - a future Roundcube core change, another plugin,
        // or this hook firing more than once could otherwise all lead to
        // "X-Clacks-Overhead X-Clacks-Overhead" being requested twice.
        // Harmless functionally, but pointless and easy to avoid.
        if (stripos($existing, 'X-Clacks-Overhead') !== false) {
            return $args;
        }

        $args['fetch_headers'] = trim($existing . ' X-Clacks-Overhead');
        return $args;
    }

    public function message_load(array $args): array
    {
        $value = $args['object']->get_header('x-clacks-overhead');
        if (!empty($value)) {
            $sanitized = $this->sanitize_clacks_value($value);
            if ($sanitized !== '') {
                $this->clacks_value = $sanitized;
            }
        }
        return $args;
    }

    /**
     * Restricts the header value to the character set the "GNU Terry
     * Pratchett" convention actually needs (see xclacksoverhead.org):
     * ASCII letters, digits, spaces, and a small set of everyday
     * punctuation.
     *
     * This is deliberately an allow-list, not just an escape.
     * htmlspecialchars() in build_widget() still makes the value safe to
     * *embed* in HTML - but it doesn't stop a header value built from
     * Unicode homoglyphs, zero-width characters, or bidi override
     * characters from visually impersonating something else entirely,
     * since none of that is HTML syntax for escaping to touch. Anything
     * outside the allow-list is dropped rather than encoded, and the
     * result is trimmed and length-capped.
     *
     * Side effect: a header that's only whitespace now sanitizes down to
     * an empty string and is therefore treated as absent, rather than
     * displayed (see tests/unit/ClacksOverheadTest.php for the test that
     * documents this).
     */
    private function sanitize_clacks_value(string $value): string
    {
        // Cap the *raw* input before filtering, not just the final result.
        // Filtering first would mean an attacker-controlled header of
        // several MB still gets fully scanned character-by-character
        // before ever being truncated - pointless memory/CPU work for a
        // value that's going to be cut down to 100 chars regardless.
        $value = mb_substr($value, 0, 1000);

        $filtered = preg_replace('/[^A-Za-z0-9 .,;:!\'"()&-]/', '', $value);

        // preg_replace() returns null on a PCRE-level failure (e.g. the
        // backtrack/recursion limit) rather than throwing - treat that
        // the same as "nothing usable came through" instead of passing
        // null into mb_substr()/trim(), which would be a type error.
        if ($filtered === null) {
            return '';
        }

        return trim(mb_substr($filtered, 0, 100));
    }

    /**
     * Build the 2×3 panel grid HTML — JS animates it after page load.
     */
    private function build_widget(): string
    {
        // Explicit ENT_QUOTES rather than relying on htmlspecialchars()'s
        // default flags: that default changed across PHP versions (pre-8.1
        // it didn't escape single quotes at all), and this plugin's CI
        // matrix spans exactly those versions. Both attributes below are
        // double-quoted today, so it's not currently exploitable either
        // way, but being explicit means it stays safe even if the markup
        // changes later.
        $safe  = htmlspecialchars($this->clacks_value, ENT_QUOTES | ENT_HTML5);
        $html  = '<a class="clacks-overhead" href="https://xclacksoverhead.org/home/about"'
               . ' target="_blank" rel="noopener noreferrer"'
               . ' title="X-Clacks-Overhead: ' . $safe . '"'
               . ' aria-label="Clacks Overhead: ' . $safe . '">';
        $html .= '<div class="clacks-grid">';
        for ($i = 0; $i < 6; $i++) {
            $html .= '<div class="clacks-panel"></div>';
        }
        $html .= '</div>';
        $html .= '<div class="clacks-label"></div>';
        $html .= '</a>';
        return $html;
    }

    private function init_assets(): void
    {
        $this->include_stylesheet($this->local_skin_path() . '/clacks_overhead.css');
        $this->include_script('clacks_overhead.js');
        $rcube = rcube::get_instance();
        // No htmlspecialchars() here on purpose: clacks_overhead.js only
        // ever writes this value via label.textContent, which never
        // parses HTML, so there's nothing to escape - and doing it anyway
        // would be actively wrong, since textContent doesn't decode HTML
        // entities back. An "&" in the value would otherwise show up as
        // the literal text "&amp;" in the widget instead of "&".
        // sanitize_clacks_value() already ran in message_load() and is
        // the only sanitization this value needs.
        $rcube->output->set_env('clacks_overhead_value', $this->clacks_value);
    }

    public function message_summary(array $args): array
    {
        if (empty($this->clacks_value)) {
            return $args;
        }

        $this->init_assets();
        $args['content'] .= $this->build_widget();
        return $args;
    }
}