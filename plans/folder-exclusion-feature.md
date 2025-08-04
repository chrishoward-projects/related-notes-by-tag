# Plan: Add Folder Exclusion Feature to Related Notes by Tag Plugin

## Overview
Add a new setting to exclude notes from specific folders, preventing them from appearing in the related notes results.

## Implementation Steps

### 1. Update Settings Interface and Defaults
- Add `excludedFolders: string` to `RelatedNotesSettings` interface
- Add default empty string to `DEFAULT_SETTINGS`
- Create new setting UI component for folder selection in `RelatedNotesSettingTab`

### 2. Implement Folder Selection UI
Since Obsidian doesn't have a built-in folder picker component, implement a text-based input with:
- Text input field for comma-separated folder paths
- Helpful description and placeholder examples
- Validation hints for folder path format

### 3. Update Tag Analyzer Logic
- Modify `TagAnalyzer.findRelatedNotes()` method to filter out files from excluded folders
- Add helper method `isFileInExcludedFolder()` to check if a file path matches excluded folders
- Support both exact folder matches and subfolder exclusion

### 4. Update Settings Integration
- Ensure the new setting is properly saved/loaded
- Pass excluded folders setting to tag analyzer

## Technical Details

### Settings Interface Changes
```typescript
export interface RelatedNotesSettings {
  // ... existing properties
  excludedFolders: string;  // comma-separated folder paths
}
```

### Folder Filtering Logic
- Parse comma-separated folder paths from settings
- Normalize folder paths (handle trailing slashes, etc.)
- Check if file path starts with any excluded folder path
- Support both exact folder names and nested folder exclusion

### UI Implementation
- Add new Setting component with text input
- Provide clear instructions: "Comma-separated folder paths (e.g., Archive, Templates, Private/Personal)"
- Show examples of valid folder path formats

## Files to Modify
1. `src/settings.ts` - Add interface property, default value, and UI component
2. `src/tag-analyzer.ts` - Add folder filtering logic to `findRelatedNotes()`

## Testing Considerations
- Test with various folder path formats
- Verify nested folder exclusion works correctly
- Ensure settings persistence works properly
- Test edge cases like empty settings, invalid paths

## Implementation Approach
This approach follows the existing patterns in the codebase and provides a straightforward way for users to exclude folders without requiring complex UI components. The text-based input is consistent with the existing excluded tags setting and provides flexibility for users to specify folder paths.