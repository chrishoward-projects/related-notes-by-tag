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

# Create and push tag
echo "Creating and pushing tag $TAG..."
git tag "$TAG"
git push origin-projects "$TAG"

# Create GitHub release
echo "Creating GitHub release..."
gh release create "$TAG" \
  --title="Release $VERSION" \
  --draft \
  --generate-notes \
  main.js manifest.json styles.css

# Create and upload zip file
echo "Creating and uploading zip file..."
zip -r "${TAG}.zip" main.js manifest.json styles.css
gh release upload "$TAG" "${TAG}.zip"

echo "Release $VERSION created successfully!"
echo "Don't forget to:"
echo "1. Edit the release notes on GitHub"
echo "2. Publish the release when ready"