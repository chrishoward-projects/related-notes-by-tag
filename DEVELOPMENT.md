# Obsidian Plugin Development Guide

This document contains the complete development workflow, processes, and best practices established for Obsidian plugin development. Use this as a reference for maintaining consistent development practices across all plugin projects.

## Core Development Principles

### Code Quality Standards
- **SOLID Principles**: Follow Single Responsibility Principle (SRP) and Don't Repeat Yourself (DRY)
- **Separation of Concerns**: Break large classes into focused service classes (e.g., DataAnalyzer, PreviewManager, UIRenderer)
- **TypeScript Best Practices**: Use proper typing, avoid `any`, clean up unused imports
- **No Comments**: Do not add code comments unless explicitly requested
- **Error Handling**: Always include proper error handling and user feedback

### Architecture Patterns
- **Service-Oriented**: Extract business logic into dedicated service classes
- **Component Pattern**: UI components should be reusable and focused
- **Event Cleanup**: Always clean up event listeners and DOM elements in `onunload()`
- **Memory Management**: Proper component lifecycle management to prevent memory leaks

## Development Workflow

### Prerequisites
- ESLint configuration for code quality
- esbuild for building
- TypeScript for type safety
- Git for version control

### Daily Development Process

1. **Make Changes**: Edit source code in `src/` directory
2. **Update Changelog**: Always update `CHANGELOG.md` BEFORE committing changes
3. **Run Lint**: `npm run lint` - Fix any linting errors
4. **Version Update**: `npm run update-version` - Bumps version, builds, and commits in one step
5. **Test**: Verify changes in test vault

### Key Commands

```bash
# Development
npm run build          # Build and deploy to test vault
npm run lint           # Run ESLint on source files
npm run deploy         # Deploy built files to test vault

# Version Management
npm run update-version  # Bump version, update all files, build, and commit (preferred)
npm version patch      # Old method - avoid to prevent dual commits

# Release Management
npm run release        # Create GitHub release (manual when ready)
```

### Script definitions

```
"scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "node esbuild.config.mjs production && ./deploy.sh",
    "lint": "eslint .",
    "test": "echo \"Error: no test specified\" && exit 1",
    "version": "node version-bump.mjs && git add manifest.json versions.json CHANGELOG.md main.js",
    "update-version": "npm version patch --no-git-tag-version && node version-bump.mjs",
    "changelog": "node prepare-changelog.mjs",
    "deploy": "./deploy.sh",
    "release": "./release.sh"
  },
```

### Version Update Process

**Use `npm run update-version` instead of `npm version patch`**

This command:
1. Updates `package.json` version (using `--no-git-tag-version`)
2. Runs `version-bump.mjs` which:
   - Updates `manifest.json` with new version
   - Updates `versions.json` with version mapping
   - Updates `CHANGELOG.md` with current date
   - Builds the plugin automatically
3. Commits all changes in one clean commit

**Never use `npm version patch` directly** - it causes dual commits.

## File Structure and Responsibilities

### Core Files
- `src/main.ts` - Plugin entry point, minimal logic
- `src/view.ts` - Main view component
- `src/settings.ts` - Settings interface and defaults
- `manifest.json` - Plugin metadata (auto-updated by version script)
- `package.json` - NPM configuration and scripts

### Service Classes (Extract from large view components)
- `src/data-analyzer.ts` - Business logic for data analysis
- `src/preview-manager.ts` - Preview popup functionality
- `src/ui-renderer.ts` - Reusable UI components

### Configuration Files
- `src/constants.ts` - All constants, icons, CSS classes, timeouts
- `eslint.config.mjs` - ESLint configuration (ignore built files)
- `esbuild.config.mjs` - Build configuration
- `version-bump.mjs` - Version management script

### Documentation
- `README.md` - User-facing documentation
- `CHANGELOG.md` - Version history (follow Keep a Changelog format)
- `RELEASE.md` - Release process documentation
- `LICENSE` - MIT license file
- `DEVELOPMENT.md` - This file (development guide)

### Build/Deploy
- `main.js` - Built plugin file (auto-generated)
- `deploy.sh` - Deployment script to test vault
- `release.sh` - GitHub release creation script

## Code Architecture Patterns

### Component Inheritance
- Use `extends Component` for classes that need lifecycle management
- PreviewManager extends Component for proper cleanup
- Always call `super()` in constructor
- Use `this.unload()` in cleanup methods

### Service Pattern
```typescript
// Extract complex logic into services
export class DataAnalyzer {
  constructor(private app: App) {}
  
  analyzeData(file: TFile, settings: Settings): AnalysisResult {
    // Business logic here
  }
}

// Use in main view
this.dataAnalyzer = new DataAnalyzer(this.app);
```

### UI Component Pattern
```typescript
// Reusable UI components
export class UIRenderer {
  createDropdown(container: HTMLElement, options: DropdownOptions) {
    // Reusable dropdown logic
  }
}
```

### Constants Organization
```typescript
export const ICONS = {
  SORT: '<svg>...</svg>',
  FILTER: '<svg>...</svg>'
};

export const CSS_CLASSES = {
  CONTAINER: 'plugin-container',
  HEADER: 'plugin-header'
};
```

## Settings Best Practices

### Settings Interface
```typescript
export interface PluginSettings {
  defaultSortMode: 'name'|'date'|'created';
  excludedTags: string;
  defaultGroupState: 'collapsed'|'expanded';
}

export const DEFAULT_SETTINGS: PluginSettings = {
  defaultSortMode: 'name',
  excludedTags: '',
  defaultGroupState: 'expanded' // Default to expanded for better UX
};
```

### Settings Validation
- Make input fields flexible and user-friendly
- Provide clear descriptions and placeholders
- Use dropdowns for constrained values
- Include helpful instructions in settings panel

## UI/UX Guidelines

### Panel Integration
- Auto-initialize panel in right sidebar on installation (but keep closed)
- Remove ribbon icons that duplicate sidebar functionality
- Use command palette for activation: "Open [Plugin Name] Panel"
- Follow Obsidian's design patterns and CSS classes

### User Experience
- Default to expanded groups for immediate visibility
- Provide preview on Cmd/Ctrl + hover
- Support Cmd/Ctrl + click for new tabs
- Include proper loading states and error messages
- Use Obsidian's standard icons and styling

### Event Handling
```typescript
// Proper event cleanup pattern
private setupEvents() {
  this.registerEvent(
    this.app.workspace.on('active-leaf-change', this.handleLeafChange)
  );
}

// Memory management
async onClose() {
  this.previewManager.cleanup();
  this.uiRenderer.cleanup();
}
```

## Release Process

### Development vs Release
- **Development**: Use `npm run update-version` for iterations
- **Release**: Use `npm run release` only when ready for public release

### Development Workflow
1. Make changes and update CHANGELOG.md
2. Run `npm run update-version` (creates single commit)
3. Continue developing without creating tags/releases
4. Repeat as needed

### Release Workflow (When Ready for Public)
1. Ensure all changes are committed
2. Run `npm run release`
3. This creates git tag (without "v" prefix: `0.2.14`)
4. Creates GitHub release as draft
5. Edit release notes and publish when ready

### Release Script Features
- Checks for uncommitted changes (fails if any)
- Builds plugin automatically
- Creates and pushes git tag
- Creates GitHub release with plugin files
- Uploads zip file for easy installation

## Version Management

### Semantic Versioning
- **Patch** (0.2.1 → 0.2.2): Bug fixes, small improvements
- **Minor** (0.2.0 → 0.3.0): New features, backwards compatible
- **Major** (0.2.0 → 1.0.0): Breaking changes

### Version Files Synchronization
The `version-bump.mjs` script ensures all version files stay in sync:
- `package.json` - NPM version
- `manifest.json` - Obsidian plugin metadata
- `versions.json` - Version/compatibility mapping
- `CHANGELOG.md` - Release date updates

### Git Tags
- Use version number directly: `0.2.14` (not `v0.2.14`)
- Tags only created for official releases
- Development versions don't create tags

## Code Quality Tools

### ESLint Configuration
```javascript
// eslint.config.mjs
export default [
  {
    ignores: ["main.js", "**/*.mjs", "node_modules/**"]
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];
```

### Build Configuration
- Use esbuild for fast builds
- Include deployment to test vault in build process
- Minify for production releases

## Documentation Standards

### README.md Structure
1. Brief description with screenshot
2. Features (organized by category)
3. Installation instructions
4. How to Use (step-by-step)
5. Settings description
6. Support information
7. Buy Me a Coffee button (optional)

### CHANGELOG.md Format
Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:
```markdown
## [0.2.14] - 2025-06-17

### Added
- New feature descriptions

### Changed
- Modified functionality

### Fixed
- Bug fixes

### Removed
- Removed features
```

### Code Documentation
- Use descriptive variable and method names
- TypeScript interfaces for complex data structures
- JSDoc comments only if explicitly requested
- Focus on self-documenting code

## Testing and Validation

### Manual Testing Checklist
- [ ] Plugin loads without errors
- [ ] All features work as expected
- [ ] Settings save and persist
- [ ] No memory leaks (check in dev tools)
- [ ] Works on both desktop and mobile (if applicable)
- [ ] Preview functionality works
- [ ] Event cleanup on plugin disable

### Pre-Release Validation
- [ ] All lint errors resolved
- [ ] Build completes successfully
- [ ] Version files synchronized
- [ ] CHANGELOG.md updated
- [ ] README.md reflects current functionality
- [ ] LICENSE file present
- [ ] No console errors in production

## Common Pitfalls and Solutions

### Version Management Issues
- **Problem**: Dual commits from npm version
- **Solution**: Use `npm run update-version` instead

### Memory Leaks
- **Problem**: Event listeners not cleaned up
- **Solution**: Always implement cleanup in `onClose()`

### Component Lifecycle
- **Problem**: MarkdownRenderer memory warnings
- **Solution**: Pass proper Component instance, use `extends Component`

### Git Tag Conflicts
- **Problem**: "v" prefix causing confusion
- **Solution**: Use plain version numbers for tags

### ESLint Errors
- **Problem**: Linting built files
- **Solution**: Proper ignore configuration in eslint.config.mjs

## Environment Setup

### Required npm Scripts
```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "node esbuild.config.mjs production && ./deploy.sh",
    "lint": "eslint .",
    "update-version": "npm version patch --no-git-tag-version && node version-bump.mjs",
    "release": "./release.sh",
    "deploy": "./deploy.sh"
  }
}
```

### Development Dependencies
- `esbuild` - Build tool
- `obsidian` - API types
- `typescript` - Type checking
- `eslint` + TypeScript plugins - Code quality
- `tslib` - TypeScript runtime

## Time and Date Handling

- Always use system time: `date` command
- Set user timezone in global CLAUDE.md: "Use my local timezone: Australia/Melbourne"
- Never rely on built-in AI knowledge for current time
- Use system date for CHANGELOG.md entries

## Final Notes

### Global CLAUDE.md Setup
Create `/Users/username/.claude/CLAUDE.md` with:
```markdown
- Always run lint after each set of changes
- commit after each set of changes
- do not try to run dev. I always have that running manually
- When you break something step back, don't automatically plow forward with broken code
- Use system time (date command) instead of built-in knowledge for accurate dates/times
- Use my local timezone: Australia/Melbourne when referencing dates and times
- Always update this CLAUDE.md file when workflows or commands change

# Development Commands
- npm run build - Build and deploy to test vault
- npm run lint - Run ESLint on source files
- npm run update-version - NEW: Bump version, update all files, build, and commit in one step
- npm version patch - OLD: Use update-version instead to avoid git conflicts
- npm run release - Create GitHub release (manual when ready)
- npm run deploy - Deploy built files to test vault

# Workflow Reminders
- Always update CHANGELOG.md before committing changes
- Use npm run update-version instead of npm version patch (prevents dual commits)
- Version updates now automatically build and include main.js
- Release process is manual - only run when ready for official release
- Use proper commit messages with Claude Code footer
- Remember to update CLAUDE.md when development processes change
```

### Success Metrics
A well-structured plugin should have:
- Clean, modular architecture
- Comprehensive documentation
- Automated build/release processes
- Proper version management
- Good user experience
- Legal compliance (LICENSE)
- Professional presentation

This guide represents the culmination of best practices learned through real plugin development and should be adapted as needed for specific plugin requirements.