<?php

use PHPUnit\Framework\TestCase;

final class ClacksOverheadTest extends TestCase
{
    protected function setUp(): void
    {
        rcmail::reset();
    }

    // -- init() wiring ----------------------------------------------------

    public function testInitAlwaysRegistersOutgoingHook(): void
    {
        $plugin = new clacks_overhead();
        $plugin->init();

        $hooks = array_column($plugin->registered_hooks, 0);
        $this->assertContains('message_before_send', $hooks);
    }

    public function testInitRegistersDisplayHooksOnlyOnShowOrPreview(): void
    {
        rcmail::get_instance()->action = 'show';

        $plugin = new clacks_overhead();
        $plugin->init();

        $hooks = array_column($plugin->registered_hooks, 0);
        $this->assertContains('storage_init', $hooks);
        $this->assertContains('message_load', $hooks);
        $this->assertContains('template_object_messagesummary', $hooks);
    }

    public function testInitSkipsDisplayHooksOnUnrelatedActions(): void
    {
        rcmail::get_instance()->action = 'compose';

        $plugin = new clacks_overhead();
        $plugin->init();

        $hooks = array_column($plugin->registered_hooks, 0);
        $this->assertNotContains('message_load', $hooks);
        $this->assertNotContains('template_object_messagesummary', $hooks);
    }

    // -- add_clacks_overhead() (outgoing mail) -----------------------------

    public function testAddClacksOverheadSetsExpectedHeaderUnconditionally(): void
    {
        $plugin  = new clacks_overhead();
        $message = new fake_outgoing_message();

        $plugin->add_clacks_overhead(['message' => $message]);

        $this->assertCount(1, $message->header_calls);
        [$headers, $overwrite] = $message->header_calls[0];
        $this->assertSame(['X-Clacks-Overhead' => 'GNU Terry Pratchett'], $headers);
        $this->assertTrue($overwrite, 'Header must overwrite, otherwise a spoofed outgoing header could survive');
    }

    // -- storage_init() (fetch_headers wiring) -----------------------------

    public function testStorageInitAddsHeaderToEmptyFetchHeaders(): void
    {
        $plugin = new clacks_overhead();

        $result = $plugin->storage_init([]);

        $this->assertSame('X-Clacks-Overhead', $result['fetch_headers']);
    }

    public function testStorageInitAppendsToExistingFetchHeaders(): void
    {
        $plugin = new clacks_overhead();

        $result = $plugin->storage_init(['fetch_headers' => 'X-Priority']);

        $this->assertSame('X-Priority X-Clacks-Overhead', $result['fetch_headers']);
    }

    public function testStorageInitDoesNotDuplicateHeaderIfAlreadyRequested(): void
    {
        $plugin = new clacks_overhead();

        $result = $plugin->storage_init(['fetch_headers' => 'X-Priority X-Clacks-Overhead']);

        $this->assertSame('X-Priority X-Clacks-Overhead', $result['fetch_headers']);
    }

    // -- message_load() + message_summary() (incoming display) ------------

    public function testMessageSummaryShowsWidgetWhenHeaderPresent(): void
    {
        $plugin = new clacks_overhead();
        $plugin->message_load(['object' => new fake_incoming_message('GNU Terry Pratchett')]);

        $args = $plugin->message_summary(['content' => '<div>original</div>']);

        $this->assertStringContainsString('clacks-overhead', $args['content']);
        $this->assertStringContainsString('GNU Terry Pratchett', $args['content']);
    }

    public function testMessageSummaryStaysUntouchedWhenHeaderAbsent(): void
    {
        $plugin = new clacks_overhead();
        $plugin->message_load(['object' => new fake_incoming_message(null)]);

        $args = $plugin->message_summary(['content' => '<div>original</div>']);

        $this->assertSame('<div>original</div>', $args['content'], 'No header on the message must mean no widget and no side effects');
    }

    public function testMessageSummaryIgnoresEmptyStringHeader(): void
    {
        $plugin = new clacks_overhead();
        $plugin->message_load(['object' => new fake_incoming_message('')]);

        $args = $plugin->message_summary(['content' => '<div>original</div>']);

        $this->assertSame('<div>original</div>', $args['content']);
    }

    /**
     * Behaviour changed with the allow-list sanitizer: whitespace no
     * longer counts as "present" content, because sanitize_clacks_value()
     * trims it down to an empty string before it's ever stored. Previously
     * this was a documented quirk (PHP's empty() treats a whitespace-only
     * string as non-empty) - it's now correctly treated as absent.
     */
    public function testMessageSummaryTreatsWhitespaceOnlyHeaderAsAbsent(): void
    {
        $plugin = new clacks_overhead();
        $plugin->message_load(['object' => new fake_incoming_message('   ')]);

        $args = $plugin->message_summary(['content' => '<div>original</div>']);

        $this->assertSame('<div>original</div>', $args['content']);
    }

    public function testMessageSummaryStripsScriptLikeCharactersFromHeaderValue(): void
    {
        $malicious = '<script>alert(1)</script>';

        $plugin = new clacks_overhead();
        $plugin->message_load(['object' => new fake_incoming_message($malicious)]);

        $args = $plugin->message_summary(['content' => '']);
        $title = $this->extractTitleAttribute($args['content']);

        // The allow-list sanitizer removes "<", ">" and "/" outright -
        // htmlspecialchars() downstream is then just defense in depth,
        // since there's nothing tag-like left for it to even need to
        // escape by the time it runs. (We check the *value* specifically,
        // not the whole widget markup - the widget's own <a>/<div> tags
        // legitimately contain "<" and ">".)
        $this->assertStringNotContainsString('<', $title);
        $this->assertStringNotContainsString('>', $title);
        // The alphabetic remainder still comes through, proving the
        // filter subtracts characters rather than dropping the value
        // wholesale.
        $this->assertStringContainsString('scriptalert', $title);
    }

    public function testMessageSummaryStripsQuoteAndTagBreakoutPayload(): void
    {
        // Mirrors the E2E "xss" fixture (tests/e2e/fixtures/inject-mail.sh):
        // a value crafted to break out of an HTML attribute and inject a
        // live element if it were ever placed into the page unfiltered.
        // Note: '<' and '>' are removed by the allow-list itself; '"' is
        // actually allowed through the filter (it's ordinary punctuation)
        // and instead relies on htmlspecialchars() in build_widget() to
        // become "&quot;" - both layers end up mattering here.
        $payload = '"><img src=x onerror=window.__clacks_xss_fired=true>';

        $plugin = new clacks_overhead();
        $plugin->message_load(['object' => new fake_incoming_message($payload)]);

        $args = $plugin->message_summary(['content' => '']);
        $title = $this->extractTitleAttribute($args['content']);

        $this->assertStringNotContainsString('<', $title);
        $this->assertStringNotContainsString('>', $title);
        $this->assertStringNotContainsString('"', $title);
    }

    public function testMessageSummaryStripsUnicodeHomoglyphsAndBidiOverride(): void
    {
        // U+0430 CYRILLIC SMALL LETTER A looks identical to ASCII "a" in
        // most fonts; U+202E is the right-to-left override control
        // character. Neither is HTML syntax, so htmlspecialchars() alone
        // would never touch them - only the allow-list catches this class
        // of spoofing.
        $homoglyph = "GNU Terry Pr\u{0430}tchett\u{202E}";

        $plugin = new clacks_overhead();
        $plugin->message_load(['object' => new fake_incoming_message($homoglyph)]);

        $args = $plugin->message_summary(['content' => '']);

        $this->assertStringNotContainsString("\u{0430}", $args['content']);
        $this->assertStringNotContainsString("\u{202E}", $args['content']);
        $this->assertStringContainsString('GNU Terry Prtchett', $args['content']);
    }

    public function testMessageSummaryCapsHeaderValueLength(): void
    {
        $plugin = new clacks_overhead();
        $plugin->message_load(['object' => new fake_incoming_message(str_repeat('A', 500))]);

        $args = $plugin->message_summary(['content' => '']);
        $title = $this->extractTitleAttribute($args['content']);

        $this->assertSame(100, strlen($title));
    }

    /**
     * The raw input is now capped (at 1000 chars) *before* preg_replace()
     * runs, not just the filtered result afterwards - this asserts an
     * extreme input still ends up correctly capped at 100, i.e. the
     * pre-filter cap doesn't accidentally corrupt or bypass the final
     * length limit.
     */
    public function testMessageSummaryCapsExtremelyLongHeaderValue(): void
    {
        $plugin = new clacks_overhead();
        $plugin->message_load(['object' => new fake_incoming_message(str_repeat('A', 50000))]);

        $args = $plugin->message_summary(['content' => '']);
        $title = $this->extractTitleAttribute($args['content']);

        $this->assertSame(100, strlen($title));
    }

    private function extractTitleAttribute(string $html): string
    {
        preg_match('/title="X-Clacks-Overhead: (.*?)"/', $html, $matches);
        return $matches[1] ?? '';
    }

    public function testMessageSummarySetsClacksValueEnvForJs(): void
    {
        $plugin = new clacks_overhead();
        $plugin->message_load(['object' => new fake_incoming_message('GNU Terry Pratchett')]);
        $plugin->message_summary(['content' => '']);

        $this->assertSame(
            'GNU Terry Pratchett',
            rcmail::get_instance()->output->env['clacks_overhead_value']
        );
    }
}
