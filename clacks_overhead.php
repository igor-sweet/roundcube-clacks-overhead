<?php

/**
  * Plugin to add `X-Clacks-Overhead: GNU Terry Pratchett` as a header to 
  * outgoing mail.
  *
  * @version 0.2
  * @since 0.1
  * @see http://www.gnuterrypratchett.com/
  * @author Martin Porcheron
  */

class clacks_overhead extends rcube_plugin
{
    public function init(): void
    {
        $this->add_hook('message_before_send', [$this, 'add_clacks_overhead']);
    }

    public function add_clacks_overhead(array $args): array
    {
        $args['message']->headers(['X-Clacks-Overhead' => 'GNU Terry Pratchett'], true);
        return $args;
    }
}

