# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Development build with watch mode and source maps
- `npm run build` - Production build (minified, no source maps)
- `npm run lint` - Run ESLint on TypeScript files

## Project Architecture

This is an Obsidian plugin written in TypeScript that displays related notes in a sidebar based on shared tags with the active note.

### Core Structure

- **Entry Point**: `src/main.ts` - Main plugin class that handles lifecycle, events, and view management
- **View Component**: `src/view.ts` - Implements the sidebar panel that displays related notes with tag-based filtering and grouping
- **Settings**: `src/settings.ts` - Plugin configuration interface and settings panel
- **Build Process**: Uses esbuild via `esbuild.config.mjs` to bundle TypeScript into `main.js`

### Key Plugin Concepts

- **Plugin Lifecycle**: Extends Obsidian's `Plugin` class with `onload()`/`onunload()` methods
- **Custom View**: Implements `ItemView` to create a sidebar panel that integrates with Obsidian's workspace
- **Event System**: Uses Obsidian's event system to monitor active file changes and metadata updates
- **Settings Management**: Integrates with Obsidian's settings system using `PluginSettingTab`

### Component Interactions

1. Main plugin registers the custom view type and manages its lifecycle
2. View component listens for workspace events and updates related notes display
3. Settings component provides user configuration that affects view behavior
4. Tag extraction and note filtering logic is contained within the view component

### Development Notes

- Plugin targets ES2018 and uses CommonJS format for Obsidian compatibility
- External Obsidian APIs are marked as external in the build process
- Uses TypeScript with strict null checks and inline source maps for development
- Refer always to Obsidian Developer Dcoumentation at [Obsidian Developer Docs](https://docs.obsidian.md/Home)

### Version Management

**IMPORTANT**: After completing any task that adds features, fixes bugs, or makes changes:
1. Update CHANGELOG.md with the changes made
2. Run `npm version patch` to bump the version and update manifest.json
3. Commit the version bump
4. This maintains proper version history and prepares for releases

## Plugin Manifest

- Plugin ID: `related-notes-by-tag`
- Minimum Obsidian version: 0.15.0
- Desktop and mobile compatible