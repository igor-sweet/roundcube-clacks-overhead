# Changelog

## [0.4]
### Added
- Allow-list sanitization of incoming `X-Clacks-Overhead` header values: only ASCII letters, digits, spaces, and everyday punctuation are kept, and the value is capped at 100 characters. Guards against Unicode homoglyphs, bidi override characters, and other display-spoofing content that HTML escaping alone doesn't address
- PHPUnit test suite covering hook wiring, header sanitization, and output escaping (`tests/unit/`)
- End-to-end test suite (GreenMail + Roundcube + Playwright) covering incoming header display and outgoing header injection across multiple Roundcube versions (`tests/e2e/`)
- GitHub Actions workflows: PHPCompatibility check, PHPUnit across PHP 7.4-8.5, and the E2E suite

### Fixed
- A header consisting only of whitespace is now correctly treated as absent instead of displaying an empty-looking indicator (a side effect of the new sanitizer trimming it away)
- `htmlspecialchars()` calls now use an explicit `ENT_QUOTES` flag instead of relying on PHP's default flags, which changed behaviour across PHP versions (pre-8.1 didn't escape single quotes by default)
- The value passed to the frontend via `set_env()` is no longer HTML-escaped before handing it to JavaScript, which only ever renders it via `textContent` - the previous double-encoding meant an `&` in the header would have displayed as the literal text `&amp;`

## [0.3] - 2026-07-07
### Added
- Animated Clacks tower indicator displayed in the message header area when receiving mail that carries the `X-Clacks-Overhead` header
- Indicator links to https://xclacksoverhead.org/home/about
- CSS and JavaScript assets for the Clacks display (elastic and larry skins)

## [0.2] - 2026-05-25
### Changed
- Updated for PHP 7.4+ / Roundcube 1.6+ compatibility
- Added explicit `public` visibility to methods
- Added return type declarations (`void`, `array`)
- Added parameter type declaration (`array $args`)
- Modernized array syntax (`[]` instead of `array()`)
- Updated `composer.json` minimum requirements

## [0.1] - Original release by Martin Porcheron
- Initial release