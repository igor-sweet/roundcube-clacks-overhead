<?php

/**
 * Minimal stand-ins for the Roundcube core classes the plugin touches.
 *
 * These are NOT full Roundcube mocks — they only implement the surface
 * area that clacks_overhead.php actually calls, so the plugin class can
 * be instantiated and its hook methods exercised in isolation, without
 * booting a real Roundcube installation.
 *
 * If clacks_overhead.php starts calling additional rcube_plugin /
 * rcmail / rcube API surface, extend the stubs here accordingly.
 */

/** Records every add_hook() call so tests can assert on wiring in init(). */
class rcube_plugin
{
    public $task = 'test';

    /** @var array<int, array{0: string, 1: mixed}> */
    public array $registered_hooks = [];

    /** @var array<int, string> */
    public array $included_stylesheets = [];

    /** @var array<int, string> */
    public array $included_scripts = [];

    public function __construct($api = null)
    {
    }

    public function add_hook(string $hook, $callback): void
    {
        $this->registered_hooks[] = [$hook, $callback];
    }

    public function include_stylesheet(string $path): void
    {
        $this->included_stylesheets[] = $path;
    }

    public function include_script(string $path): void
    {
        $this->included_scripts[] = $path;
    }

    public function local_skin_path(): string
    {
        return '/skins/test';
    }
}

/** Captures set_env() calls instead of touching a real template engine. */
class rcube_output_stub
{
    /** @var array<string, mixed> */
    public array $env = [];

    public function set_env(string $key, $value): void
    {
        $this->env[$key] = $value;
    }
}

/**
 * Stand-in for both `rcube` and `rcmail` singletons (rcmail extends rcube
 * in real Roundcube; the plugin calls get_instance() on either name).
 */
class rcmail
{
    private static ?rcmail $instance = null;

    public string $action = '';

    public rcube_output_stub $output;

    private function __construct()
    {
        $this->output = new rcube_output_stub();
    }

    public static function get_instance(): rcmail
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /** Test helper: force a fresh singleton between test cases. */
    public static function reset(): void
    {
        self::$instance = null;
    }
}

class rcube extends rcmail
{
}

/** Stand-in for the outgoing Mail_mime-ish object passed to message_before_send. */
class fake_outgoing_message
{
    /** @var array<int, array{0: array<string, string>, 1: bool}> */
    public array $header_calls = [];

    public function headers(array $headers, bool $overwrite = false): void
    {
        $this->header_calls[] = [$headers, $overwrite];
    }
}

/** Stand-in for the incoming rcube_message object passed to message_load. */
class fake_incoming_message
{
    private ?string $header_value;

    public function __construct(?string $header_value)
    {
        $this->header_value = $header_value;
    }

    public function get_header(string $name): ?string
    {
        return strtolower($name) === 'x-clacks-overhead' ? $this->header_value : null;
    }
}

require_once __DIR__ . '/../../clacks_overhead.php';
