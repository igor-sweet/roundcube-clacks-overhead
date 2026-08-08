#!/usr/bin/env bash
#
# Packages the plugin into distributable .zip/.tar.gz archives.
#
# Pulled out of .github/workflows/release.yml on purpose: what actually
# ends up in a release archive should be visible and diffable in one
# place, not buried in a workflow's `run:` block where an added file
# could easily go unnoticed.
#
# Usage: ./scripts/build-release.sh <version>
# Example: ./scripts/build-release.sh 0.4
#
# Run from the repository root. Produces, in the current directory:
#   clacks_overhead-<version>.zip
#   clacks_overhead-<version>.tar.gz
set -euo pipefail

VERSION="${1:?Usage: $0 <version> (e.g. 0.4)}"
STAGING_DIR="clacks_overhead"

# Everything that ships in a release. Add new files/dirs here - and
# nowhere else - when the plugin grows.
FILES_TO_PACKAGE=(
  clacks_overhead.php
  clacks_overhead.js
  composer.json
  LICENSE
  README.md
  CHANGELOG.md
  ExampleClacks.svg
)
DIRS_TO_PACKAGE=(
  skins
)

rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

for f in "${FILES_TO_PACKAGE[@]}"; do
  cp "$f" "$STAGING_DIR/"
done
for d in "${DIRS_TO_PACKAGE[@]}"; do
  cp -r "$d" "$STAGING_DIR/"
done

echo "Packaging version $VERSION with:"
find "$STAGING_DIR" -type f | sort

zip -r "clacks_overhead-${VERSION}.zip" "$STAGING_DIR/"
tar -czf "clacks_overhead-${VERSION}.tar.gz" "$STAGING_DIR/"

rm -rf "$STAGING_DIR"

echo "Built clacks_overhead-${VERSION}.zip and clacks_overhead-${VERSION}.tar.gz"
