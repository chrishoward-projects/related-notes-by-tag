# Release Process

This plugin uses a manual release process to avoid cluttering development with automatic tags and releases.

## Development Workflow

### 1. Update Changelog
Before making changes, update `CHANGELOG.md`:
- Add new features, changes, and fixes under the current version
- Follow the established format with Added/Changed/Fixed sections
- Update the date when appropriate

### 2. Version Bump
Use the custom version command to bump the version:

```bash
# For all changes (patches, features, etc.)
npm run update-version
```

This will:
- Update the version in `package.json`
- Update the version in `manifest.json`
- Update `versions.json` with the new version mapping
- Update `CHANGELOG.md` with the current date
- Build the plugin automatically
- Create a single git commit with all changes

**Note:** This replaces the old `npm version patch` which caused dual commits.

### 3. Continue Development
No tags or releases are created during development. You can:
- Continue making changes
- Run `npm run update-version` as needed
- Keep iterating without release overhead

## Creating Official Releases

When ready to create an official release for the community:

### 1. Run Release Script
```bash
npm run release
# or
./release.sh
```

This will:
- Check for uncommitted changes (fails if any)
- Build the plugin
- Create and push a git tag (e.g., v0.2.12)
- Create a GitHub release (as draft)
- Upload required files (`main.js`, `manifest.json`, `styles.css`)
- Create and upload zip file

### 2. Publish Release
Go to GitHub releases and:
- Edit the release notes
- Publish the draft release when ready

## Manual Release (if needed)

If the release script fails:

1. Ensure all changes are committed
2. Run `npm run build`
3. Manually create git tag: `git tag v0.2.12 && git push origin v0.2.12`
4. Create GitHub release manually
5. Upload `main.js`, `manifest.json`, and `styles.css`

## Files Included in Release

- `main.js` - Compiled plugin code
- `manifest.json` - Plugin metadata
- `styles.css` - Plugin styles
- `{version}.zip` - Zip file containing all above files

## Key Changes from Previous Process

- **No automatic releases** - Releases are manual when ready
- **Single commits** - Version updates create one clean commit
- **No development tags** - Tags only created for official releases
- **Cleaner workflow** - Separate development from release process