#!/bin/bash

# Release script for Obsidian Plugin
# Creates a GitHub release from the current version

set -e

# Get current version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="$VERSION"

echo "Creating release for version $VERSION (tag: $TAG)"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "Error: There are uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Build the plugin
echo "Building plugin..."
npm run build

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "Error: Tag $TAG already exists"
    exit 1
fi

# Push the branch first so the repo's committed manifest.json matches the
# release (Obsidian's update checker reads manifest.json from the default
# branch, not from release assets)
BRANCH=$(git branch --show-current)
echo "Pushing branch $BRANCH..."
git push origin-projects "$BRANCH"

# Create and push tag
echo "Creating and pushing tag $TAG..."
git tag "$TAG"
git push origin-projects "$TAG"

# Find the previous release tag so we know how much of CHANGELOG.md is new
PREV_TAG=$(git tag --list | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | grep -v "^${TAG}$" | sort -t. -k1,1n -k2,2n -k3,3n | tail -1)

# Extract changelog entries from the top down to (not including) the previous release's heading
NOTES_FILE=$(mktemp)
awk -v prev_heading="## [$PREV_TAG]" '
  $0 == prev_heading { exit }
  /^## \[/ { printing=1 }
  printing { print }
' CHANGELOG.md > "$NOTES_FILE"

# Create GitHub release
echo "Creating GitHub release..."
gh release create "$TAG" \
  --title="$VERSION" \
  --draft \
  --notes-file="$NOTES_FILE" \
  main.js manifest.json styles.css

rm -f "$NOTES_FILE"

echo "Release $VERSION created successfully!"
echo "Don't forget to:"
echo "1. Review the release notes on GitHub"
echo "2. Publish the release when ready"