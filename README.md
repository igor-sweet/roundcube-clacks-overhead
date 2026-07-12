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

## Semaphore encoding

The animated indicator renders each character of the header value as a
2×3 grid of shutters ("panels"), the same visual style used by the
original [x-clacks-overhead browser extension](https://github.com/wgmyers/x-clacks-overhead),
whose semaphore art (concept: Richard Atha-Nicholls, art: Amy
Atha-Nicholls) is itself taken from Backspindle Games' *Clacks: A
Discworld Board Game* (2015). This plugin draws its own panels rather
than reusing that artwork, but keeps the same letter-to-pattern
mapping so the display reads the same way across extensions.

The extension's table only ever needed 29 states (A-Z, space, an END
marker, and a fully-blank state) out of the 64 a 2×3 grid can
represent - because the real Discworld convention it's based on is
letters-and-space only. Since this plugin's `sanitize_clacks_value()`
allows a wider set (digits and everyday punctuation, to be a more
forgiving *display*, not because the fiction ever needed them), we
extended the table using states the letter encoding leaves unused,
verified collision-free against the original 29:

The tables below use ⬛/🔲 purely because that renders reliably in
plain Markdown - it's a schematic, not a color-accurate preview. The
actual widget (`skins/*/clacks_overhead.css`) is dark grey when off
and a glowing amber when on, small rounded 10×10px tiles with a 2px
gap, closer to a lit shutter than a checkerboard. To scale, in the
real colors, "G" and a space look like this:

![ExampleClacks](data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNjYgNTAiIHdpZHRoPSIxMzIiIGhlaWdodD0iMTAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogICAgICAgIDwhLS0gRzogMTEvMDEvMDAgLS0+CiAgICAgICAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiByeD0iMSIgZmlsbD0iI2Y1YzgiLz4KICAgICAgICA8cmVjdCB4PSIxMiIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiByeD0iMSIgZmlsbD0iI2Y1YzgiLz4KICAgICAgICA8cmVjdCB4PSIwIiB5PSIxMiIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiByeD0iMSIgZmlsbD0iIzU1NTU1NSIvPgogICAgICAgIDxyZWN0IHg9IjEyIiB5PSIxMiIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiByeD0iMSIgZmlsbD0iI2Y1YzgiLz4KICAgICAgICA8cmVjdCB4PSIwIiB5PSIyNCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiByeD0iMSIgZmlsbD0iIzU1NTU1NSIvPgogICAgICAgIDxyZWN0IHg9IjEyIiB5PSIyNCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiByeD0iMSIgZmlsbD0iIzU1NTU1NSIvPgogICAgICAgIDx0ZXh0IHg9IjExIiB5PSI0NCIgZm9udC1zaXplPSI5IiBmb250LWZhbWlseT0ibW9uZXNwYWNlIiBmaWxsPSIjODg4ODg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5HPC90ZXh0PgogICAgICAgICAgICAKICAgICAgICAgICAgICAgIDwhLS0gUFA6IDAwLzAwLzEwIC0tPgogICAgICAgIDxyZWN0IHg9IjQ0IiB5PSIwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHJ4PSIxIiBmaWxsPSIjNTU1NTU1Ii8+CiAgICAgICAgPHJlY3QgeD0iNTYiIHk9IjAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgcng9IjEiIGZpbGw9IiM1NTU1NTUiLz4KICAgICAgICA8cmVjdCB4PSI0NCIgeT0iMTIiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgcng9IjEiIGZpbGw9IiM1NTU1NTUiLz4KICAgICAgICA8cmVjdCB4PSI1NiIgeT0iMTIiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgcng9IjEiIGZpbGw9IiM1NTU1NTUiLz4KICAgICAgICA8cmVjdCB4PSI0NCIgeT0iMjQiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgcng9IjEiIGZpbGw9IiNmNWM4NCIvPgogICAgICAgIDxyZWN0IHg9IjU2IiB5PSIyNCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiByeD0iMSIgZmlsbD0iIzU1NTU1NSIvPgogICAgICAgIDx0ZXh0IHg9IjU1IiB5PSI0NCIgZm9udC1zaXplPSI5IiBmb250LWZhbWlseT0ibW9uZXNwYWNlIiBmaWxsPSIjODg4ODg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4uPC90ZXh0PgogICAgICA8L3N2Zz4=)

(Full-color animated screenshots of the widget in context are already
produced by the E2E suite - see the Playwright test report artifact
on any [E2E run](../../actions/workflows/e2e.yml) rather than
committing screenshots here.)

Each cell below shows the 2×3 panel exactly as the widget renders it
(⬛ = shutter closed, 🔲 = shutter open, top to bottom):

**Letters + space**

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| ⬛⬛<br>🔲⬛<br>⬛🔲 | ⬛⬛<br>⬛🔲<br>🔲⬛ | ⬛⬛<br>🔲🔲<br>⬛⬛ | 🔲⬛<br>⬛⬛<br>🔲⬛ | 🔲🔲<br>⬛⬛<br>🔲⬛ | 🔲🔲<br>🔲⬛<br>⬛⬛ | 🔲🔲<br>⬛🔲<br>⬛⬛ |

| H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|
| 🔲⬛<br>⬛⬛<br>🔲🔲 | 🔲⬛<br>🔲⬛<br>🔲⬛ | ⬛🔲<br>⬛🔲<br>🔲🔲 | ⬛🔲<br>🔲⬛<br>⬛🔲 | 🔲⬛<br>🔲⬛<br>🔲🔲 | 🔲⬛<br>🔲🔲<br>🔲🔲 | ⬛🔲<br>🔲⬛<br>🔲🔲 |

| O | P | Q | R | S | T | U |
|---|---|---|---|---|---|---|
| 🔲🔲<br>🔲🔲<br>⬛⬛ | 🔲🔲<br>🔲🔲<br>🔲⬛ | 🔲🔲<br>⬛🔲<br>🔲⬛ | 🔲🔲<br>🔲⬛<br>🔲⬛ | ⬛🔲<br>🔲🔲<br>🔲⬛ | 🔲🔲<br>⬛🔲<br>⬛🔲 | ⬛⬛<br>⬛🔲<br>🔲🔲 |

| V | W | X | Y | Z | SPACE |
|---|---|---|---|---|---|
| ⬛⬛<br>🔲⬛<br>🔲🔲 | 🔲🔲<br>🔲⬛<br>⬛🔲 | 🔲⬛<br>⬛🔲<br>🔲⬛ | 🔲⬛<br>⬛🔲<br>⬛🔲 | 🔲⬛<br>🔲🔲<br>⬛🔲 | ⬛⬛<br>⬛⬛<br>🔲⬛ |

**Digits**

| 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| ⬛⬛<br>⬛⬛<br>⬛🔲 | ⬛⬛<br>⬛🔲<br>⬛⬛ | ⬛⬛<br>⬛🔲<br>⬛🔲 | ⬛⬛<br>🔲⬛<br>⬛⬛ | ⬛⬛<br>🔲⬛<br>🔲⬛ | ⬛⬛<br>🔲🔲<br>⬛🔲 | ⬛⬛<br>🔲🔲<br>🔲⬛ |

| 7 | 8 | 9 |
|---|---|---|
| ⬛⬛<br>🔲🔲<br>🔲🔲 | ⬛🔲<br>⬛⬛<br>⬛⬛ | ⬛🔲<br>⬛⬛<br>⬛🔲 |

**Punctuation**

| . | , | ; | : | ! | ' | " |
|---|---|---|---|---|---|---|
| ⬛🔲<br>⬛⬛<br>🔲⬛ | ⬛🔲<br>⬛⬛<br>🔲🔲 | ⬛🔲<br>⬛🔲<br>⬛⬛ | ⬛🔲<br>⬛🔲<br>⬛🔲 | ⬛🔲<br>⬛🔲<br>🔲⬛ | ⬛🔲<br>🔲⬛<br>⬛⬛ | ⬛🔲<br>🔲⬛<br>🔲⬛ |

| ( | ) | & | - |
|---|---|---|---|
| ⬛🔲<br>🔲🔲<br>⬛⬛ | ⬛🔲<br>🔲🔲<br>⬛🔲 | ⬛🔲<br>🔲🔲<br>🔲🔲 | 🔲⬛<br>⬛⬛<br>⬛⬛ |

That's 48 characters plus a fully-blank state and the two control
markers below - 51 of the 64 possible states, leaving 13 free for
future use (see `clacks_overhead.js` for the exact bit values).

### GNU control-code marker

The fictional Discworld "Overhead" (the part of a Clacks message
reserved for network-operator instructions, separate from the
customer's own message) uses a `GNU` prefix with a specific,
documented meaning:

- **G**: send the message on
- **N**: do not log the message
- **U**: turn the message around at the end of the line and send it back again

Nothing about the visual grid tells you "GNU" is being used as those
three commands rather than as three ordinary letters - that
distinction lives entirely in the reader's knowledge of the
convention, in the fiction and on the real web alike. Since this
plugin always sends the literal tribute value `GNU Terry Pratchett`,
and a real Clacks Overhead could in principle carry any operator code
(not just this one), we bracket a `GNU`-prefixed value with a pair of
reserved marker patterns, unused by any letter, digit, or punctuation
above, mirrored start-to-end:

| start 1 | start 2 | | end 1 | end 2 |
|---|---|---|---|---|
| 🔲🔲<br>⬛⬛<br>⬛⬛ | ⬛⬛<br>⬛⬛<br>🔲🔲 | | ⬛⬛<br>⬛⬛<br>🔲🔲 | 🔲🔲<br>⬛⬛<br>⬛⬛ |

G, N and U keep their normal letter patterns inside the brackets -
only the surrounding marker is new. This is our own extension for
legibility, not something documented in the books; it doesn't change
the header value itself or its sanitization, only how the indicator
animates it.

---

## Disclaimer

This is a personal fork of the original plugin by [Martin Porcheron](https://github.com/mporcheron/roundcube-clacks-overhead), updated for compatibility with current PHP and Roundcube versions.

This fork is not actively maintained. Use at your own risk.

## License

MIT — see [LICENSE](LICENSE)