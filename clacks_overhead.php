<?php

/**
 * Plugin to add `X-Clacks-Overhead: GNU Terry Pratchett` as a header to
 * outgoing mail, and display an animated Clacks tower indicator when
 * receiving mail that carries the header.
 *
 * @version 0.3
 * @since 0.1
 * @see http://www.gnuterrypratchett.com/
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
        $args['fetch_headers'] = trim(($args['fetch_headers'] ?? '') . ' X-Clacks-Overhead');
        return $args;
    }

    public function message_load(array $args): array
    {
        $value = $args['object']->get_header('x-clacks-overhead');
        if (!empty($value)) {
            $this->clacks_value = $value;
        }
        return $args;
    }

    /**
     * Build the 2×3 panel grid HTML — JS animates it after page load.
     */
    private function build_widget(): string
    {
        $safe  = htmlspecialchars($this->clacks_value);
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
        $rcube->output->set_env('clacks_overhead_value', htmlspecialchars($this->clacks_value));
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