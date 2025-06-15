# Changelog

All notable changes to the Related Notes by Tag plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-01-XX

### Added
- **Matched Tags Toggle**: New button to show/hide which specific tags match between notes
- **Sort Controls**: Dropdown to sort notes by name, modified date, or created date
- **Filter Controls**: Dropdown to set minimum tag match requirements (1, 2, or 3+ tags)
- **Expand/Collapse**: Clickable tag group headers to expand/collapse note lists
- **Preview Support**: Hover with Cmd/Ctrl to preview note content
- **Settings Panel**: Comprehensive settings with custom title, sort mode, excluded tags, and group state
- **GitHub Actions**: Automated release workflow for streamlined publishing
- **Mobile Support**: Plugin works on both desktop and mobile devices

### Changed
- **Refactored Architecture**: Separated concerns into TagAnalyzer, PreviewManager, and UIRenderer classes
- **Improved UI**: Updated to match Obsidian's design patterns with proper icons and styling
- **Better Performance**: Optimized tag analysis and file filtering logic
- **Enhanced Accessibility**: Added proper hover states, tooltips, and keyboard interactions

### Fixed
- **Memory Management**: Proper cleanup of event listeners and DOM elements
- **Type Safety**: Comprehensive TypeScript typing throughout the codebase
- **UI Consistency**: Aligned with Obsidian's standard component styling and behavior
- **Dropdown Behavior**: Fixed issue where multiple dropdowns could be open simultaneously

## [0.1.14] - 2025-01-XX

### Added
- **Core Functionality**: Basic related notes discovery based on shared tags
- **Sidebar Integration**: Dedicated view panel in the right sidebar
- **Automatic Updates**: Real-time refresh when switching between notes
- **Tag Group Display**: Notes organized by the tags they share
- **Click Navigation**: Click note names to open them
- **Ribbon Icon**: Quick access button in the Obsidian ribbon
- **Command Palette**: "Open Related Notes Panel" command

### Technical
- **Plugin Foundation**: Initial plugin structure with TypeScript and esbuild
- **Event Handling**: Workspace and metadata change event listeners
- **CSS Styling**: Custom styles that integrate with Obsidian themes
- **Settings Interface**: Basic plugin settings integration

---

## Release Process

This changelog is maintained manually and should be updated for each release:

1. **Before Release**: Update the changelog with new features, changes, and fixes
2. **Version Bump**: Use `npm version patch/minor/major` to create a new release
3. **Release Notes**: Copy changelog entries to GitHub release notes

## Categories

- **Added**: New features
- **Changed**: Changes in existing functionality  
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes