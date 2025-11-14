# Changelog

All notable changes to the Related Notes by Tag plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.4.4]

### Fixed
- Startup error "updateView is not a function" caused by race condition during plugin initialization
- Added runtime type guard to ensure view is fully initialized before calling methods

## [0.4.3]

### Added
- Tag groups are now sorted by note count (highest to lowest) instead of creation order

## [0.4.2]

### Changed
- Simplified README and added a usage tip for large tag collections
- Update usage instructions in settings for mobile users

## [0.4.1]

### Added
- Tag count next to group title

## [0.4.0]

### Added
- **Sidebar State Preservation**: Tag group collapsed/expanded states now persist when clicking outside sidebar or navigating between notes
- **Expand/Collapse All Button**: New button to quickly expand or collapse all tag groups at once
- **Obsidian-Style Icons**: Uses official Lucide double chevron icons matching Obsidian's interface
- **Smart State Management**: Individual tag states preserved within note sessions, bulk operations reset states

### Technical Improvements
- Implemented global tag state preservation system with `tagGroupStates` Map
- Added state capture and restoration logic around DOM updates
- Created clean expand/collapse all toggle independent of individual group states
- Enhanced UI with proper Obsidian chevron icons and hover states
- Added comprehensive state cleanup when using bulk operations

### User Experience
- Tag groups remember their state when switching focus or navigating
- Bulk expand/collapse operations work reliably on first click
- Button state reflects intended action (show "Expand All" when groups can be expanded)
- Individual toggles work independently from bulk operations
- Smooth integration with existing controls and consistent styling

## [0.3.1]

### Changed
- Updated readme image to remove my doubled tag that was misleading
- Updated usage instructions to be clearer how to launch command palette

## [0.3.0]

### Added
- **Folder Exclusion Feature**: Exclude files from specific folders when finding related notes
- Individual folder path configuration with autocomplete suggestions
- Toggle option to include/exclude subfolders for each exclusion
- Dynamic descriptions that update in real-time as settings change
- Add/delete functionality with intuitive icons (folder-plus to add, trash to delete)
- Full Obsidian theme compatibility with CSS variables
- Comprehensive path normalization for cross-platform compatibility

### Technical Improvements
- Added FolderSuggestions class for folder autocomplete functionality
- Extended RelatedNotesSettings interface with excludedFolders array
- Implemented robust path normalization and folder exclusion logic
- Added folder exclusion styles following Obsidian plugin guidelines
- Comprehensive testing with 100% test coverage on core logic

## [0.2.19]

### Fixed
- Wrong version number showing

## [0.2.18]

### Fixed
- Resolve conflict with other plugins caused by generic constant name.

## [0.2.17]

### Changed
- Remove build artifacts (main.js, data.json) from repository
- Add build artifacts to .gitignore to separate source from release assets

## [0.2.16]

### Fixed
- Remove direct view reference management to comply with Obsidian submission guidelines
- Use workspace API to find views instead of storing references
- Remove plugin title from settings screen
- Use sentence case in UI, product / brand names
- Tweak usage instructions for clarity

## [0.2.15]

### Fixed
- Replace innerHTML usage with DOM API for security compliance
- Move inline styles to CSS for better theme adaptability  
- Remove plugin name from command name per Obsidian guidelines
- Remove leaf detaching antipattern from onunload method
- Clean up unused imports

## [0.2.14] - 2025-06-17

### Added
- **LICENSE file**: Added MIT license file for proper legal documentation

### Fixed
- **Release tags**: Removed "v" prefix from git tags (now uses 0.2.14 instead of v0.2.14)
- **Documentation**: Updated README and RELEASE.md to reflect current workflow

## [0.2.13] - 2025-06-17

### Fixed
- **Tidy display text**: Ensure consistent language and capitalisation of text for plugin name usage.

## [0.2.12] - 2025-06-17

### Added
- **Auto-initialization**: Panel now automatically appears in right sidebar on installation without opening
- **Better UX**: Users can see the panel is available without it being intrusive

## [0.2.11] - 2025-06-17

### Changed
- **Release Process**: Separated GitHub release creation from automatic workflow to manual script
- **Development**: Removed automatic tagging on every version for cleaner development workflow

## [0.2.10] - 2025-06-17

### Changed
- **Activation**: Removed activation button as added clutter
- **Settings**: Updated help info

## [0.2.9] - 2025-06-17

### Improved
- **Version Process**: Added automatic build step to version updates to ensure main.js is always current

## [0.2.8] - 2025-06-17

### Improved
- **Excluded Tags**: Made # prefix optional for excluded tags in settings - users can enter tags with or without # prefix

## [0.2.7] - 2025-06-17

### Changed
- **Default View**: Changed default group state from collapsed to expanded for better user experience

## [0.2.6] - 2025-06-17

### Fixed
- **Build**: Build main.js

## [0.2.5] - 2025-06-16

### Added
- **Documentation**: Added screenshot and Buy Me a Coffee button to README

### Fixed
- **Preview Functionality**: Fixed hover preview not working with proper Component handling
- **Memory Leaks**: Resolved Component memory leak warnings in preview rendering
- **ESLint**: Fixed linting configuration and removed unused imports

## [0.2.4] - 2025-06-16

### Fixed
- **Code Cleanup**: add deploy, add donate links

## [0.2.3] - 2025-06-16

### Fixed
- **Code Cleanup**: Removed unnecessary console.logs and todo.md

## [0.2.2] - 2025-06-16

### Fixed
- **Code Cleanup**: Removed remnant code from header content including unused constants, CSS, and settings

## [0.2.1] - 2025-06-16

### Fixed
- **Dropdown Behavior**: Fixed issue where multiple dropdowns could be open simultaneously

## [0.2.0] - 2025-06-16

### Added
- **Matched Tags Toggle**: New button to show/hide which specific tags match between notes
- **Sort Controls**: Dropdown to sort notes by name, modified date, or created date
- **Filter Controls**: Dropdown to set minimum tag match requirements (1, 2, or 3+ tags)
- **Expand/Collapse**: Clickable tag group headers to expand/collapse note lists
- **Preview Support**: Hover with Cmd/Ctrl to preview note content
- **Settings Panel**: Comprehensive settings with sort mode, excluded tags, and group state
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

## [0.1.14] - 2025-06-15

### Added
- **Core Functionality**: Basic related notes discovery based on shared tags
- **Sidebar Integration**: Dedicated view panel in the right sidebar
- **Automatic Updates**: Real-time refresh when switching between notes
- **Tag Group Display**: Notes organized by the tags they share
- **Click Navigation**: Click note names to open them
- **Ribbon Icon**: Quick access button in the Obsidian ribbon
- **Command Palette**: "Open Related Notes by Tag sidebar" command

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