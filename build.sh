#!/usr/bin/env bash
# Build script for TabTerminator Firefox extension

VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')
OUTPUT="tabterminator-${VERSION}.zip"

echo "Building TabTerminator v${VERSION}..."

# Remove old build if exists
rm -f "$OUTPUT"

# Create ZIP with only the necessary files
zip -r "$OUTPUT" \
  manifest.json \
  background.js \
  config.js \
  tabManager.js \
  popup.html \
  popup.css \
  popup.js \
  options.html \
  options.css \
  options.js \
  icons/ \
  LICENSE \
  README.md \
  -x "*.git*" "*/.claude/*" "*/claude.md" "*/AMO_SUBMISSION.md" "*.DS_Store"

echo "✅ Created $OUTPUT"
echo ""
echo "Next steps:"
echo "1. Test the extension: unzip and load in Firefox"
echo "2. Take screenshots for AMO listing"
echo "3. Submit to https://addons.mozilla.org/developers/addon/submit/"
