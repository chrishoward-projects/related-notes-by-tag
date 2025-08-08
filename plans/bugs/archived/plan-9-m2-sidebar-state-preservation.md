# Sidebar State Preservation - Comprehensive Implementation Plan

## Problem Analysis

**Root Cause:** The sidebar loses expand/collapse state because:
1. `updateView()` calls `container.empty()` destroying all DOM elements and their state
2. Updates trigger on clicks outside sidebar, note switches, and metadata changes
3. Only global `defaultGroupState` setting is applied, no per-note memory
4. Tag group states exist only in DOM CSS classes that get wiped

## Solution Architecture

### 1. State Storage Structure
```typescript
interface TagGroupState {
  tagName: string;
  isCollapsed: boolean;
}

interface NoteState {
  filePath: string;
  lastAccessed: number;
  tagGroupStates: TagGroupState[];
}

interface SidebarStatePreservation {
  enabled: boolean;           // Feature toggle
  maxRecentNotes: number;     // Number of notes to remember (default 5)
  recentNotes: NoteState[];   // Cached states for recent notes
}
```

### 2. Implementation Plan

#### Phase 1: Settings Integration
- Add state preservation settings to `RelatedNotesSettings` interface
- Add UI controls in settings tab with:
  - Toggle to enable/disable feature
  - Number input for max recent notes (1-20, default 5)
  - Description explaining the feature

#### Phase 2: State Management Core
- Add state capture method to `RelatedNotesView`
  - Scan DOM for tag groups before clearing
  - Extract tag name and collapsed state from each group
- Add state restoration method
  - Apply saved states when creating tag groups
  - Fall back to global `defaultGroupState` for unknown tags
- Add state update method for immediate saves on user clicks

#### Phase 3: Integration Points
- Modify `updateView()` to capture state before `container.empty()`
- Modify `renderTagGroups()` to apply saved state instead of only global setting
- Modify `setupTagGroupToggle()` to save state changes immediately
- Add cache management to limit stored notes and update access times

#### Phase 4: Plugin Lifecycle
- Add state management methods to main plugin class
- Integrate with existing settings save/load system
- Ensure proper cleanup and no memory leaks

### 3. Detailed Implementation Steps

**Step 1:** Extend settings interface and default values
**Step 2:** Add settings UI controls with validation  
**Step 3:** Create state management class or methods in view
**Step 4:** Implement capture logic before DOM operations
**Step 5:** Implement restoration logic during tag group creation
**Step 6:** Implement immediate state saving on user interactions
**Step 7:** Add cache management and cleanup
**Step 8:** Integration testing and edge case handling

### 4. Code Changes Required

#### settings.ts Changes
```typescript
export interface RelatedNotesSettings {
  // ... existing settings
  sidebarStatePreservation: {
    enabled: boolean;
    maxRecentNotes: number;
    recentNotes: NoteState[];
  };
}
```

#### view.ts Changes
- Add state capture before `container.empty()`
- Add state restoration in `renderTagGroups()`
- Modify toggle handlers to save state immediately

#### main.ts Changes
- Ensure state persistence through plugin settings

### 5. User Experience

#### Behavior When Enabled
- User expands/collapses tag groups
- State is remembered per note (up to configured limit)
- When returning to a note, previous state is restored
- New notes use global `defaultGroupState`
- Cache manages memory with LRU-style cleanup

#### Behavior When Disabled
- Reverts to current behavior
- Uses global `defaultGroupState` for all tag groups
- No additional memory usage

### 6. Key Benefits
- Preserves user's expand/collapse preferences per note
- Maintains natural workflow without state loss
- Configurable to user preferences (default disabled for backward compatibility)
- Efficient memory usage with configurable cache limits
- Does not interfere with dynamic nature of plugin

### 7. Edge Cases Handled
- Notes with changing tag structures
- Plugin disable/re-enable scenarios  
- Settings changes affecting cache size
- File renames/moves (uses file path as key)
- Memory cleanup and limits

### 8. Technical Notes
- State captured from DOM before destruction
- Restoration applied during DOM creation
- Immediate persistence on user interactions
- Cache management prevents unbounded memory growth
- Backward compatible with existing installations