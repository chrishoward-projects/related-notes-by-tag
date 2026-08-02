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

**Note:** This replaces the old `npm version patch` which caused dual commits.

### 3. Commit

Run a commit describing all changes

### 4. Continue Development
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
- Push the current branch (so the repo's committed `manifest.json` matches the release — Obsidian's update checker reads `manifest.json` from the default branch, not from release assets)
- Create and push a git tag matching `package.json`'s version (e.g., `0.4.6`, no `v` prefix — required by Obsidian's plugin release format)
- Create a GitHub release (as draft) titled with the bare version number
- Generate release notes automatically from `CHANGELOG.md`, covering every version entry back to the previous release (so a release that skips an intermediate version, e.g. 0.4.4 → 0.4.6, still includes 0.4.5's entries)
- Upload required files (`main.js`, `manifest.json`, `styles.css`)

### 2. Publish Release
Go to GitHub releases and:
- Review the auto-generated release notes, editing if needed
- Publish the draft release when ready

## Manual Release (if needed)

If the release script fails:

1. Ensure all changes are committed
2. Run `npm run build`
3. Manually create git tag: `git tag 0.4.6 && git push origin-projects 0.4.6`
4. Create GitHub release manually, titled with the bare version number (e.g. `0.4.6`, no `v` prefix)
5. Paste in the relevant `CHANGELOG.md` entries as the release notes
6. Upload `main.js`, `manifest.json`, and `styles.css`

## Files Included in Release

- `main.js` - Compiled plugin code
- `manifest.json` - Plugin metadata
- `styles.css` - Plugin styles

## Key Changes from Previous Process

- **No automatic releases** - Releases are manual when ready
- **Single commits** - Version updates create one clean commit
- **No development tags** - Tags only created for official releases
- **Cleaner workflow** - Separate development from release process