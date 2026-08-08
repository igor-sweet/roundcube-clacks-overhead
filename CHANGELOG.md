# Changelog

## [Unreleased]
### Added
- The animation now shows the reserved END pattern once after the last character, then pauses for 10 seconds before looping back to the start - the message has run the length of the line and is being turned around, rather than restarting instantly
- `README.md` "Semaphore encoding" section: the full character table (shown as the actual on/off panel grid, not raw bit notation), what G/N/U mean in-universe, and where the panel visual style originally comes from
- `ExampleClacks.svg`: a to-scale, real-color reference image (`#555`/`#f5c842`, matching `skins/*/clacks_overhead.css`) for the README - the character table itself stays black/white for plain-Markdown compatibility, so this fills in what the actual widget looks like
- `tests/unit-js/`: Node-based unit tests (via the built-in `node:test` runner, no new dependency) for the panel-encoding table, `encodePattern()`, and `buildFrames()` - collision-freedom, the GNU bracket, and the mirrored-marker/END relationship are now regression-tested, not just manually verified
- `tests/e2e/playwright/tests/animation.spec.ts`: an E2E test that uses Playwright's Clock API to pause real browser time once the message is loaded, then fast-forward through the animation and confirm the overhead brackets, the trailing END marker, and the loop restart actually render as designed - without waiting out the real ~58s cycle on every CI run. The expected message length is derived from the actual injected fixture value rather than hardcoded, so the test can't silently drift out of sync with the fixture it's testing against
- `clacks_overhead.js`: a `data-clacks-animating` guard prevents a second animation loop from starting on the same widget if the plugin's `'init'` handler ever fires more than once for it
- `clacks_overhead.js` exposes two small debug hooks on `window` (`__clacksOverheadInitCalls`, `__clacksOverheadDebug.nextDueAt`), used by the E2E test above to verify the guard and to keep its manual clock control in sync with the real animation loop. There's no build/minify step (see `scripts/build-release.sh`), so these ship as-is in every release - noted here for transparency rather than left as an undocumented surface

### Changed
- Animation timing: 850ms → 1750ms per character shown, 150ms → 250ms blank pulse between frames
- `clacks_overhead.js`'s exported overhead-bracket constants are now named `OVERHEAD_START`/`OVERHEAD_END` (previously `STEUER_START`/`STEUER_END`), matching the terminology already used in README.md's "GNU control-code marker" section

## [0.6]
### Fixed
- The animated indicator no longer uses `charCodeAt(0) & 0x3F` to derive panel patterns. That bit-mask collided on 20 of the 74 characters the sanitizer allows (e.g. "p"/"0" and "a"/"!" produced identical panel patterns) - it's replaced with the real, verified collision-free semaphore table used by the original x-clacks-overhead browser extension, extended with our own digit/punctuation patterns (see README.md "Semaphore encoding")

### Added
- Panel patterns for digits and everyday punctuation, so the indicator can render the full character set `sanitize_clacks_value()` allows, not just A-Z and space
- A reserved, mirrored pair of control-marker patterns that brackets a `GNU`-prefixed header value, distinguishing the Discworld Overhead's G/N/U operator code from three ordinary letters (display-only; does not affect the header value or its sanitization)

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