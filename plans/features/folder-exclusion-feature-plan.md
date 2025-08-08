# Folder Exclusion Feature Plan - Issue #2

## Overview
This plan addresses GitHub issue #2: "FR: exclude files from specific folder" by implementing folder-based exclusion functionality in the Related Notes by Tag plugin.

## Requirements Summary
Based on user specifications:
1. **Absolute paths** - Support absolute folder paths from vault root
2. **Future feature**: __Wildcard Support__ Design as extensible feature for future enhancements
3. **Folder picker** - Prepare architecture for folder picker integration. Build cutom picker 
4. **Future feature** __Large vault perfomance Mark__ as future enhancement capability
5. **Include children** - Option to include/exclude subfolders
6. **Multiple paths** - Add/Edit/Delete individual folder paths
7. **Settings integration** - All functionality within plugin settings

## Phase 1: Data Structure & Settings

### Extend Settings Interface
```typescript
interface RelatedNotesSettings {
  // ... existing settings ...
  excludedFolders: FolderExclusion[];
}

interface FolderExclusion {
  path: string;           // Absolute path from vault root
  includeChildren: boolean; // Whether to exclude subfolders
  id: string;            // Unique identifier for UI management
}
```

### Default Settings Update
```typescript
export const DEFAULT_SETTINGS: RelatedNotesSettings = {
  // ... existing defaults ...
  excludedFolders: [],
};
```

## Phase 2: Core Logic Implementation

### Folder Exclusion Logic
Create new utility functions in `tag-analyzer.ts`:

```typescript
private isFileInExcludedFolder(file: TFile, settings: RelatedNotesSettings): boolean {
  const filePath = file.path;
  
  return settings.excludedFolders.some(exclusion => {
    const normalizedExclusionPath = this.normalizePath(exclusion.path);
    const normalizedFilePath = this.normalizePath(filePath);
    
    if (exclusion.includeChildren) {
      // Check if file is in folder or any subfolder
      return normalizedFilePath.startsWith(normalizedExclusionPath + '/') ||
             normalizedFilePath === normalizedExclusionPath;
    } else {
      // Check if file is directly in the folder (not subfolders)
      const fileDir = normalizedFilePath.substring(0, normalizedFilePath.lastIndexOf('/'));
      return fileDir === normalizedExclusionPath;
    }
  });
}

private normalizePath(path: string): string {
  // Remove leading/trailing slashes, handle edge cases
  return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}
```

### Integration with Tag Analysis
Modify `findRelatedNotes()` method:

```typescript
private findRelatedNotes(activeFile: TFile, currentTags: string[], minTagMatches: number, settings: RelatedNotesSettings): Map<string, FileWithMatchedTags[]> {
  const relatedNotesMap = new Map<string, FileWithMatchedTags[]>();
  const allMarkdownFiles = this.app.vault.getMarkdownFiles();

  for (const file of allMarkdownFiles) {
    if (file.path === activeFile.path) continue;
    
    // NEW: Apply folder exclusion filter
    if (this.isFileInExcludedFolder(file, settings)) continue;

    const overlappingTags = this.getOverlappingTags(file, currentTags);
    
    if (overlappingTags.length >= minTagMatches) {
      // ... rest of existing logic
    }
  }

  return relatedNotesMap;
}
```

## Phase 3: Settings UI Components

### Folder Exclusion Settings Section
Add to `RelatedNotesSettingTab.display()`:

```typescript
// Add after existing settings
containerEl.createEl('h3', { text: 'Folder Exclusion' });

// Container for folder exclusion list
const folderExclusionContainer = containerEl.createDiv('folder-exclusion-container');

// Render existing exclusions
this.renderFolderExclusions(folderExclusionContainer);

// Add new folder button
new Setting(containerEl)
  .setName('Add excluded folder')
  .setDesc('Add a new folder to exclude from related notes')
  .addButton(button => button
    .setButtonText('Add Folder Path')
    .setCta()
    .onClick(() => {
      this.addNewFolderExclusion(folderExclusionContainer);
    }));
```

### Individual Folder Exclusion UI
```typescript
private renderFolderExclusions(container: HTMLElement): void {
  container.empty();
  
  this.plugin.settings.excludedFolders.forEach((exclusion, index) => {
    const setting = new Setting(container)
      .setName(`Folder ${index + 1}`)
      .addText(text => text
        .setPlaceholder('/path/to/folder')
        .setValue(exclusion.path)
        .onChange(async (value) => {
          this.plugin.settings.excludedFolders[index].path = value;
          await this.plugin.saveSettings();
        }))
      .addToggle(toggle => toggle
        .setTooltip('Include subfolders')
        .setValue(exclusion.includeChildren)
        .onChange(async (value) => {
          this.plugin.settings.excludedFolders[index].includeChildren = value;
          await this.plugin.saveSettings();
        }))
      .addButton(button => button
        .setButtonText('Delete')
        .setWarning()
        .onClick(async () => {
          this.plugin.settings.excludedFolders.splice(index, 1);
          await this.plugin.saveSettings();
          this.renderFolderExclusions(container);
        }));
    
    // Add description for include children toggle
    setting.descEl.createSpan({ 
      text: exclusion.includeChildren ? ' (includes subfolders)' : ' (direct folder only)',
      cls: 'setting-item-description'
    });
  });
}

private addNewFolderExclusion(container: HTMLElement): void {
  const newExclusion: FolderExclusion = {
    path: '',
    includeChildren: true,
    id: Date.now().toString()
  };
  
  this.plugin.settings.excludedFolders.push(newExclusion);
  this.plugin.saveSettings();
  this.renderFolderExclusions(container);
}
```

## Phase 4: Testing & Validation

### Path Validation
- Test absolute paths: `/Personal/Journal`, `/Work/Projects/Secret`
- Handle edge cases: root paths, trailing slashes, empty paths
- Cross-platform compatibility (Windows: `\` vs `/`)

### Performance Considerations
- Cache normalized paths to avoid repeated string operations
- Early termination in folder checking loops
- Efficient path matching algorithms

## Implementation Order

### Immediate (Current Release)
1. ✅ **Data Structure**: Add `FolderExclusion` interface and settings
2. ✅ **Core Logic**: Implement `isFileInExcludedFolder()` method
3. ✅ **Integration**: Modify `findRelatedNotes()` to apply folder exclusion
4. ✅ **Settings UI**: Add folder exclusion management interface
5. ✅ **Testing**: Validate with various folder structures

### Future Release
1. 🔮 **Folder Picker**: Integration with Obsidian's native folder selection
2. 🔮 **Enhanced UI**: Visual folder browser with tree view
3. 🔮 **Bulk Operations**: Import/export exclusion lists
4. 🔮 **Smart Suggestions**: Auto-suggest commonly excluded folders

## Technical Details

### Path Format
- **Input**: Absolute paths from vault root (e.g., `/Personal/Journal/Private`)
- **Storage**: JSON array in plugin settings
- **Normalization**: Remove leading/trailing slashes, handle multiple slashes

### UI Framework
- **Base**: Native Obsidian Settings API
- **Components**: Custom folder exclusion list with add/edit/delete
- **Validation**: Real-time path validation with visual feedback

### Performance
- **Complexity**: O(n×m) where n = files, m = excluded folders
- **Optimization**: Path normalization caching, early loop termination
- **Memory**: Minimal overhead with efficient string operations

## Files to Modify

1. **`src/settings.ts`**
   - Add `FolderExclusion` interface
   - Extend `RelatedNotesSettings`
   - Add folder exclusion UI components

2. **`src/tag-analyzer.ts`**
   - Add `isFileInExcludedFolder()` method
   - Add path normalization utilities
   - Modify `findRelatedNotes()` integration

3. **`src/main.ts`**
   - Update default settings
   - Ensure settings migration if needed

## Success Criteria

- ✅ Users can add multiple folder paths for exclusion
- ✅ Each path has configurable "include children" option
- ✅ Individual paths can be edited or deleted
- ✅ Folder exclusion works alongside existing tag exclusion
- ✅ Performance remains acceptable with large vaults
- ✅ UI is intuitive and follows Obsidian design patterns

## Future Enhancements

- **Folder Picker Integration**: When Obsidian API supports it
- **Relative Path Support**: Support paths relative to current note
- **Pattern Matching**: Support wildcards and regex patterns
- **Exclusion Profiles**: Save/load different exclusion configurations
- **Visual Feedback**: Show excluded file count in settings
