# Folder Exclusion Feature Implementation Plan

## Overview

Implementation plan for GitHub issue #2: "FR: exclude files from specific folder" by implementing folder-based exclusion functionality in the Related Notes by Tag plugin.

## Analysis Summary

After reviewing both the feature plan and the move-by-tag plugin patterns, I understand how to:

1. **Folder Path Selections**: Using the FolderSuggestions pattern from move-by-tag for autocomplete
2. **Multi-item Settings**: Using dynamic UI with add/edit/delete functionality like TagMappings
3. **Data Structure**: FolderExclusion interface with path, includeChildren, and id fields
4. **Core Logic**: Path normalization and filtering in tag-analyzer.ts

## Implementation Plan (4 Phases + Branch Creation)

### Phase 0: Branch Setup
- Create new branch `feature/folder-exclusion`
- Ensure clean working directory

**Commands:**
```bash
git checkout -b feature/folder-exclusion
```

### Phase 1: Data Structure & Settings Interface

**Files to modify:**
- `src/settings.ts` - Add FolderExclusion interface and extend RelatedNotesSettings
- `src/main.ts` - Update DEFAULT_SETTINGS with excludedFolders: []

**Implementation Details:**

#### src/settings.ts
```typescript
export interface FolderExclusion {
  path: string;           // Absolute path from vault root
  includeChildren: boolean; // Whether to exclude subfolders
  id: string;            // Unique identifier for UI management
}

export interface RelatedNotesSettings {
  defaultSortMode: 'name'|'date'|'created';
  defaultFilterMode: 1 | 2 | 3;
  excludedTags: string;
  defaultGroupState: 'collapsed'|'expanded';
  showMatchedTags: boolean;
  excludedFolders: FolderExclusion[];  // NEW
}
```

#### src/main.ts
```typescript
export const DEFAULT_SETTINGS: RelatedNotesSettings = {
  defaultSortMode: 'name',
  defaultFilterMode: 1,
  excludedTags: '',
  defaultGroupState: 'expanded',
  showMatchedTags: false,
  excludedFolders: [],  // NEW
};
```

**Deliverables:**
- New FolderExclusion interface with path, includeChildren, id
- Extended RelatedNotesSettings interface
- Updated default settings
- **COMMIT AFTER COMPLETION**

### Phase 2: Core Logic Implementation  

**Files to modify:**
- `src/tag-analyzer.ts` - Add folder exclusion filtering logic

**Implementation Details:**

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

**Integration into findRelatedNotes():**
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

**Deliverables:**
- `isFileInExcludedFolder()` method with path normalization
- `normalizePath()` utility function
- Integration into `findRelatedNotes()` method
- **COMMIT AFTER COMPLETION**

### Phase 3: Settings UI Components

**Files to create/modify:**
- Create `src/folder-suggestions.ts` (adapted from move-by-tag)
- `src/settings.ts` - Add folder exclusion UI components

**Implementation Details:**

#### src/folder-suggestions.ts
```typescript
import { App } from 'obsidian';

export class FolderSuggestions {
  constructor(private app: App) {}

  public async searchFolders(query: string): Promise<string[]> {
    if (!query) return [];
    
    const folders = this.app.vault.getAllFolders();
    
    let folderPaths = folders.map(folder => {
      return folder.path === '/' ? '/' : (folder.path.startsWith('/') ? folder.path : '/' + folder.path);
    });
    
    return folderPaths
      .filter(path => path.toLowerCase().includes(query.toLowerCase()))
      .sort();
  }

  public displayFolderSuggestions(folders: string[]) {
    // Implementation adapted from move-by-tag plugin
    // Full implementation details in move-by-tag/src/ui/FolderSuggestions.ts
  }
}
```

#### src/settings.ts UI Components
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

**UI Methods:**
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

**Deliverables:**
- Folder suggestion autocomplete functionality
- Dynamic folder exclusion list with add/edit/delete
- Individual folder settings with path input and includeChildren toggle
- **COMMIT AFTER COMPLETION**

### Phase 4: Testing & Validation

**Testing focus:**
- Path normalization edge cases
- Include/exclude children functionality
- UI interaction and data persistence
- Integration with existing tag filtering

**Test Cases:**
1. **Path Normalization**:
   - `/Personal/Journal` vs `Personal/Journal/` vs `Personal/Journal`
   - Root paths, trailing slashes, empty paths
   - Cross-platform compatibility

2. **Include Children Logic**:
   - Exclude `/Work` with includeChildren=true should exclude `/Work/Projects/file.md`
   - Exclude `/Work` with includeChildren=false should NOT exclude `/Work/Projects/file.md`

3. **UI Functionality**:
   - Add new folder exclusion
   - Edit existing paths and toggles
   - Delete exclusions
   - Autocomplete suggestions

4. **Integration**:
   - Works alongside existing tag exclusion
   - Performance with large vaults
   - Settings persistence

**Deliverables:**
- Validated functionality across all test cases
- Performance optimization if needed
- **COMMIT AFTER COMPLETION**

## Key Implementation Patterns from move-by-tag

1. **FolderSuggestions class**: Autocomplete with `searchFolders()` and `displayFolderSuggestions()`
2. **Dynamic UI rendering**: `renderFolderExclusions()` method that recreates UI on changes
3. **Settings persistence**: Immediate `saveSettings()` on any change
4. **Path handling**: Proper normalization and leading slash management

## Technical Architecture

### Data Flow
1. User configures excluded folders in settings
2. Settings stored as FolderExclusion[] array
3. TagAnalyzer.findRelatedNotes() filters files using isFileInExcludedFolder()
4. Filtered results displayed in sidebar

### Path Format
- **Input**: Absolute paths from vault root (e.g., `/Personal/Journal/Private`)
- **Storage**: JSON array in plugin settings
- **Normalization**: Remove leading/trailing slashes, handle multiple slashes

### Performance Considerations
- **Complexity**: O(n×m) where n = files, m = excluded folders
- **Optimization**: Path normalization caching, early loop termination
- **Memory**: Minimal overhead with efficient string operations

## Success Criteria

- ✅ Multiple folder paths with individual controls
- ✅ Include/exclude children toggle per folder  
- ✅ Add/edit/delete individual paths
- ✅ Integration with existing tag exclusion
- ✅ Intuitive UI following Obsidian patterns
- ✅ Performance optimization with path normalization

## Future Enhancements

- **Folder Picker Integration**: When Obsidian API supports it
- **Relative Path Support**: Support paths relative to current note
- **Pattern Matching**: Support wildcards and regex patterns
- **Exclusion Profiles**: Save/load different exclusion configurations
- **Visual Feedback**: Show excluded file count in settings

## Implementation Notes

- **Authorization Required**: Request permission before each phase
- **Commit Strategy**: Commit after each completed phase
- **Branch Management**: Work in `feature/folder-exclusion` branch
- **Code Review**: Follow Obsidian plugin guidelines and security practices