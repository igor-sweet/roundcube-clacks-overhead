# Changelog

## [0.5]
### Added
- `scripts/build-release.sh` and `scripts/extract-changelog-section.sh`: release packaging and changelog-section extraction, pulled out of the release workflow so what ships in a release is visible and runnable locally, not only readable inside CI YAML
- CI status badges in the README

### Changed
- **The release workflow's test gate is now actually functional.** v0.4 was tagged with a `release.yml` whose `release` job declared `needs: [syntax, phpunit, compatibility, e2e]` - but those job names didn't exist anywhere in that workflow file (`needs:` can only reference jobs defined in the *same* file; the real jobs lived in `unit-tests.yml`/`e2e.yml`). In practice this meant the dependency was broken, so v0.4 could have been published without its tests actually passing. Fixed by turning `syntax.yml`, `unit-tests.yml`, and `e2e.yml` into reusable workflows (`workflow_call`) that `release.yml` now genuinely calls and depends on.
- Release notes now link back to the CI run that validated the release, and only include the changelog section for that specific version instead of the entire file

### Fixed
- `storage_init()` no longer appends `X-Clacks-Overhead` to `fetch_headers` if it's already present, avoiding a duplicated header request
- The header value is now length-capped *before* being regex-filtered, not just after, and a null `preg_replace()` result (a PCRE-level failure) is handled explicitly instead of being passed on
- Links to gnuterrypratchett.com now use `https://`

## [0.4]
### Known issue
- The release workflow's test gate did not actually work (see the "Changed" entry under 0.5) - this version's release process did not verify that tests passed before publishing. No problems were found in the plugin code itself as a result, but the gate itself should not be trusted for this tag.

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