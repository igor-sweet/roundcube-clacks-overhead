#!/usr/bin/env bash
#
# Extracts a single version's section from CHANGELOG.md (between its
# "## [X.Y]" heading and the next one), for use as GitHub release notes.
#
# Same reasoning as build-release.sh: this used to be an awk one-liner
# buried in release.yml - pulling it out makes it something you can run
# and read locally, instead of only discovering what it does by reading
# workflow YAML.
#
# Usage: ./scripts/extract-changelog-section.sh <version> [changelog-file]
# Example: ./scripts/extract-changelog-section.sh 0.4
#
# Prints the section to stdout. Exits non-zero (with nothing printed) if
# no matching "## [<version>]" heading is found - this is deliberate: it
# means CHANGELOG.md wasn't updated before tagging, which is worth
# catching rather than shipping a release with empty/missing notes.
set -euo pipefail

VERSION="${1:?Usage: $0 <version> [changelog-file]}"
CHANGELOG_FILE="${2:-CHANGELOG.md}"

SECTION="$(awk -v ver="$VERSION" '
  BEGIN { found = 0 }
  /^## \[/ {
    if (found) exit
    if (index($0, "[" ver "]") > 0) { found = 1; next }
  }
  found { print }
' "$CHANGELOG_FILE")"

if [ -z "$(echo "$SECTION" | tr -d '[:space:]')" ]; then
  echo "No changelog section found for version '$VERSION' in $CHANGELOG_FILE." >&2
  echo "Did you forget to replace [Unreleased] with [$VERSION] - <date> before tagging?" >&2
  exit 1
fi

echo "$SECTION"
