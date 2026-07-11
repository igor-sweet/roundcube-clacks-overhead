# Roundcube Clacks Overhead Plugin

[![PHP Syntax Check](https://github.com/igor-sweet/roundcube-clacks-overhead/actions/workflows/syntax.yml/badge.svg)](https://github.com/igor-sweet/roundcube-clacks-overhead/actions/workflows/syntax.yml)
[![Unit Tests](https://github.com/igor-sweet/roundcube-clacks-overhead/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/igor-sweet/roundcube-clacks-overhead/actions/workflows/unit-tests.yml)
[![E2E Tests](https://github.com/igor-sweet/roundcube-clacks-overhead/actions/workflows/e2e.yml/badge.svg)](https://github.com/igor-sweet/roundcube-clacks-overhead/actions/workflows/e2e.yml)
[![Release](https://github.com/igor-sweet/roundcube-clacks-overhead/actions/workflows/release.yml/badge.svg)](https://github.com/igor-sweet/roundcube-clacks-overhead/actions/workflows/release.yml)

Roundcube plugin that adds the `X-Clacks-Overhead: GNU Terry Pratchett` header 
to all outgoing mail sent via Roundcube. Once enabled, this plugin needs no 
configuration.

See [GNU Terry Pratchett](https://www.gnuterrypratchett.com/) for more plugins 
for other software as well as background information to this plugin.

---

## Requirements

- Roundcube 1.6+
- PHP 7.4+

## Installation

1. Download the latest release ZIP from the [Releases](../../releases) page
2. Extract the archive — it will create a folder named `clacks_overhead`
3. Move the `clacks_overhead` folder into your Roundcube `plugins/` directory
4. Add the plugin to your `config/config.inc.php`:

```php
$config['plugins'] = ['clacks_overhead'];
```

## Features

- Adds `X-Clacks-Overhead: GNU Terry Pratchett` to all outgoing emails
- Displays an animated Clacks tower indicator in the message header when receiving mail that carries the header — click to learn more about the project
---

## Disclaimer

This is a personal fork of the original plugin by [Martin Porcheron](https://github.com/mporcheron/roundcube-clacks-overhead), updated for compatibility with current PHP and Roundcube versions.

This fork is not actively maintained. Use at your own risk.

## License

MIT — see [LICENSE](LICENSE)