# Release Process

This plugin uses GitHub Actions to automate releases. Here's how to create a new release:

## Automated Release Process

### 1. Update Changelog
Before creating a release, update `CHANGELOG.md`:
- Add new features, changes, and fixes under the current version
- Follow the established format with Added/Changed/Fixed sections
- Optionally use `npm run changelog <version>` to prepare a template for the next version

### 2. Version Bump
Use npm's version command to bump the version:

```bash
# For bug fixes
npm version patch

# For new features
npm version minor

# For breaking changes
npm version major
```

This will:
- Update the version in `package.json`
- Update the version in `manifest.json`
- Update `versions.json` with the new version mapping
- Update `CHANGELOG.md` with the current date
- Create a git commit with the version bump
- Create a git tag

### 3. Push to GitHub
Push the changes and tags to GitHub:

```bash
git push && git push --tags
```

### 4. Automatic Release
The GitHub Action will automatically:
- Build the plugin
- Create a GitHub release (as draft)
- Upload the required files (`main.js`, `manifest.json`, `styles.css`)
- Create a zip file for easy installation

### 5. Publish Release
Go to GitHub releases and publish the draft release.

## Manual Release (if needed)

If you need to create a release manually:

1. Update `manifest.json` with new version
2. Update `versions.json` with version mapping
3. Run `npm run build`
4. Create a GitHub release with tag matching the version
5. Upload `main.js`, `manifest.json`, and `styles.css`

## Files Included in Release

- `main.js` - Compiled plugin code
- `manifest.json` - Plugin metadata
- `styles.css` - Plugin styles
- `{version}.zip` - Zip file containing all above files