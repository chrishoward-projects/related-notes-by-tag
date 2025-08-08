# Plan 5 (M) Sidebar State Preservation

## Problem Analysis

### Issue Description
When clicking outside of the related notes sidebar, the view resets and loses all user interaction state (collapsed/expanded tag groups). This breaks the user experience by discarding the user's preferred view configuration.

### Root Cause Analysis

**Primary Issue: Nuclear DOM Updates**
- The `updateView()` method performs complete DOM rebuilds via `this.container.empty()`
- Every update destroys ALL UI state including user interactions
- No mechanism exists to preserve user preferences during updates

**Trigger Events Causing State Loss**
1. **Active Leaf Changes** (`main.ts:33-47`) - Primary culprit for "clicking outside" issue
   - Clicking outside sidebar changes active leaf → triggers `updateView()` after 100ms
2. **Note Navigation** - When user switches to a different note
   - New active file → complete sidebar content change → all state lost
   - Different notes may have different tag sets requiring state strategy decisions
3. **Metadata Changes** (`main.ts:51-58`) - Tag modifications in files
4. **Settings Changes** (`main.ts:84-91`) - Plugin configuration updates
5. **UI Control Changes** (`view.ts:17-33`) - Sort/filter/toggle modifications

**State Storage Gap**
- Plugin only persists `defaultGroupState` (global default)
- No runtime tracking of individual tag group states
- No consideration for per-note vs global state preservation strategies

## Solution Strategy: Smart State Preservation

### Approach: Session-Level State Management
Implement intelligent state preservation that maintains dynamic updates while preserving user interaction state.

### Note Change Handling Strategy

When users navigate between notes, the sidebar must update to show related notes for the new active file. This presents several state preservation challenges:

#### State Preservation Options

**Option 1: Global Tag State (Recommended)**
- Preserve tag group states globally across all notes
- If "obsidian" tag was collapsed in Note A, it remains collapsed when viewing Note B
- **Pros**: Consistent user experience, simpler implementation, user sets preference once
- **Cons**: May not match user's mental model if they want per-note states
- **Use Case**: User generally prefers certain tags always collapsed (e.g., system tags)

**Option 2: Per-Note State**
- Preserve tag group states individually for each note
- Returning to Note A restores its specific tag group states
- **Pros**: Maximum flexibility, supports different workflows per note
- **Cons**: Complex implementation, higher memory usage, potential user confusion
- **Use Case**: User works with different note types requiring different tag visibility

**Option 3: Hybrid Approach**
- Global state as default, with per-note overrides
- **Pros**: Best of both approaches
- **Cons**: Most complex implementation

#### Recommended Implementation: Global Tag State

For the initial implementation, use **Global Tag State** approach because:
- Simpler to implement and maintain
- Matches user expectation that UI preferences persist
- Lower memory footprint
- Easier to extend later if per-note state is needed

#### Note Transition Behavior

```typescript
// When active file changes, the state flow should be:
1. Capture current tag states (existing functionality)
2. Detect active file change
3. Analyze new file's related notes
4. Rebuild sidebar with new content
5. Restore tag states based on global state map
6. Handle cases where tags don't exist in new note's context
```

#### Edge Cases for Note Changes

1. **Tag Disappears**: User had "writing" tag collapsed, switches to note without "writing" tag
   - **Solution**: State persists in memory, will be restored if user returns to note with "writing" tag

2. **New Tags Appear**: User switches to note with tags never seen before
   - **Solution**: New tags use `defaultGroupState` setting

3. **Rapid Note Navigation**: User quickly switches between multiple notes
   - **Solution**: Debounced updates prevent excessive DOM rebuilds

4. **Return to Previous Note**: User navigates back to previously viewed note
   - **Solution**: Preserved global tag states automatically restore familiar layout

## Implementation Plan

### Phase 1: Core State Management

#### 1. Add State Tracking to View Class

```typescript
// Add to RelatedNotesView class in view.ts
export class RelatedNotesView extends ItemView {
  // ... existing properties
  private tagGroupStates: Map<string, boolean> = new Map(); // tag → isCollapsed
  
  // Capture current state before DOM operations
  private captureCurrentState(): void {
    const tagGroups = this.container.querySelectorAll(`.${CSS_CLASSES.TAG_GROUP}`);
    this.tagGroupStates.clear();
    
    tagGroups.forEach((group: HTMLElement) => {
      const headerEl = group.querySelector(`.${CSS_CLASSES.TAG_GROUP_HEADER}`);
      if (headerEl?.textContent) {
        const tagName = headerEl.textContent.replace('Notes with tag: ', '');
        const isCollapsed = group.hasClass('collapsed');
        this.tagGroupStates.set(tagName, isCollapsed);
      }
    });
  }
  
  // Restore state after DOM rebuild
  private restoreState(): void {
    const tagGroups = this.container.querySelectorAll(`.${CSS_CLASSES.TAG_GROUP}`);
    
    tagGroups.forEach((group: HTMLElement) => {
      const headerEl = group.querySelector(`.${CSS_CLASSES.TAG_GROUP_HEADER}`);
      if (headerEl?.textContent) {
        const tagName = headerEl.textContent.replace('Notes with tag: ', '');
        const shouldBeCollapsed = this.tagGroupStates.get(tagName);
        
        if (shouldBeCollapsed !== undefined) {
          group.toggleClass('collapsed', shouldBeCollapsed);
        }
      }
    });
  }
}
```

#### 2. Modify updateView() Method

```typescript
async updateView() {
  if (!this.plugin.app.workspace.layoutReady) {
    return;
  }

  // ⚡ Capture current state BEFORE destroying DOM
  this.captureCurrentState();
  
  this.container.empty();
  this.container.addClass(CSS_CLASSES.CONTAINER);
  
  const headerEl = this.renderHeader();
  this.renderControls(headerEl);
  
  const activeFile = this.getActiveFile();
  if (!activeFile) return;
  
  const analysisResult = this.tagAnalyzer.analyzeRelatedNotes(activeFile, this.plugin.settings);
  
  if (analysisResult.currentNoteTags.length === 0) {
    this.container.createEl('p', { text: 'Active note has no tags.' });
    return;
  }
  
  if (analysisResult.relatedNotesMap.size === 0) {
    this.container.createEl('p', { text: 'No other notes found with matching tags.' });
    return;
  }
  
  this.renderTagGroups(analysisResult.relatedNotesMap);
  
  // ✨ Restore state AFTER DOM rebuild
  this.restoreState();
}
```

#### 3. Enhanced renderTagGroups() Method

```typescript
private renderTagGroups(relatedNotesMap: Map<string, FileWithMatchedTags[]>): void {
  relatedNotesMap.forEach((files, tag) => {
    // Determine initial state: use saved state or fall back to default
    const savedState = this.tagGroupStates.get(tag);
    const shouldBeCollapsed = savedState !== undefined 
      ? savedState 
      : this.plugin.settings.defaultGroupState === 'collapsed';
    
    const tagGroupEl = this.container.createDiv({ 
      cls: `${CSS_CLASSES.TAG_GROUP} ${shouldBeCollapsed ? 'collapsed' : 'expanded'}`
    });
    
    const headerEl = tagGroupEl.createEl('div', { 
      text: `Notes with tag: ${tag}`, 
      cls: CSS_CLASSES.TAG_GROUP_HEADER 
    });
    
    const listEl = tagGroupEl.createEl('ul', { cls: CSS_CLASSES.NOTES_LIST });

    this.setupTagGroupToggle(tagGroupEl, headerEl, tag); // ← Pass tag for state tracking
    
    const sortedFiles = this.tagAnalyzer.sortFiles(files, this.plugin.settings.defaultSortMode);
    this.renderFileList(listEl, sortedFiles);
    
    tagGroupEl.createEl('hr', { cls: CSS_CLASSES.SEPARATOR });
  });
}
```

#### 4. Enhanced Toggle Handler with State Persistence

```typescript
private setupTagGroupToggle(tagGroupEl: HTMLElement, headerEl: HTMLElement, tag: string): void {
  headerEl.addEventListener('click', () => {
    const willBeCollapsed = !tagGroupEl.hasClass('collapsed');
    tagGroupEl.toggleClass('collapsed', willBeCollapsed);
    
    // 💾 Update state tracking immediately
    this.tagGroupStates.set(tag, willBeCollapsed);
  });
}
```

### Phase 2: Performance Optimization (Optional)

#### Debounced Updates
```typescript
// Add to RelatedNotesView
private updateDebounceTimer: number | null = null;

private debouncedUpdateView(): void {
  if (this.updateDebounceTimer) {
    clearTimeout(this.updateDebounceTimer);
  }
  
  this.updateDebounceTimer = setTimeout(() => {
    this.updateView();
    this.updateDebounceTimer = null;
  }, 150); // Debounce rapid updates
}

// Use debouncedUpdateView() instead of updateView() in event handlers
```

### Phase 3: Advanced Optimization (Future)

#### Differential Updates
```typescript
private lastAnalysisResult: Map<string, FileWithMatchedTags[]> | null = null;

private hasSignificantChanges(newResult: Map<string, FileWithMatchedTags[]>): boolean {
  if (!this.lastAnalysisResult) return true;
  
  // Compare tag sets and file lists
  const oldTags = new Set(this.lastAnalysisResult.keys());
  const newTags = new Set(newResult.keys());
  
  return !this.setsEqual(oldTags, newTags) || this.filesChanged(newResult);
}
```

## Alternative Approaches Considered

### Option A: Debounced Updates Only (Minimal Changes)
- **Pros**: Simple implementation, reduces update frequency
- **Cons**: Still loses state, just less frequently
- **Verdict**: Not recommended as primary solution

### Option B: Differential Updates Only (Advanced)
- **Pros**: Maximum performance, minimal DOM changes
- **Cons**: Complex implementation, harder to maintain
- **Verdict**: Good for future optimization phase

### Option C: Persistent Storage
- **Pros**: Survives plugin reloads
- **Cons**: Overly complex for session-level issue
- **Verdict**: Unnecessary for this problem

## Implementation Benefits

✅ **Preserves User Experience**: Tag groups maintain collapsed/expanded state as expected  
✅ **Maintains Dynamic Updates**: Real-time updates continue working when notes/tags change  
✅ **Minimal Performance Impact**: State capture/restore operations are very fast  
✅ **Backward Compatible**: No breaking changes to existing functionality  
✅ **Clean Architecture**: State management contained within view class  
✅ **Extensible**: Foundation for future enhancements

## Risk Assessment

**Low Risk Implementation**
- Changes are isolated to the view class
- No external API changes
- Fallback behavior maintains current functionality
- Easy to test and validate

**Potential Issues**
- Memory usage: Negligible (small Map with string keys)
- Performance: Minimal overhead for state operations
- Compatibility: No breaking changes expected

## Testing Strategy

1. **Basic Functionality**
   - Verify tag groups expand/collapse correctly
   - Confirm state preservation across updates
   - Test with various tag configurations

2. **Note Change Scenarios**
   - Navigate between notes with overlapping tags (state should persist)
   - Switch to note with completely different tags (new tags use defaults)
   - Return to previously viewed notes (states should be restored)
   - Rapid note navigation (verify debounced updates work correctly)
   - Navigate from note with many tags to note with few tags
   - Navigate from note with no tags to note with many tags

3. **Edge Cases**
   - Empty tag lists
   - Rapid updates
   - Settings changes during interaction
   - Tag removal/addition while viewing related notes
   - Plugin reload scenarios

4. **Integration Testing**
   - Active leaf changes (primary issue)
   - Note navigation (new primary focus)
   - Metadata updates
   - Settings modifications

## Success Criteria

- ✅ Tag group states persist when clicking outside sidebar
- ✅ Tag group states persist when navigating between notes
- ✅ Global tag states work consistently across different notes
- ✅ New tags in different notes use default state appropriately
- ✅ Dynamic updates continue working normally
- ✅ No performance degradation during note navigation
- ✅ Clean code architecture maintained
- ✅ User experience significantly improved for all navigation scenarios

## Next Steps

1. Implement Phase 1 core state management
2. Test thoroughly with various scenarios
3. Monitor performance impact
4. Consider Phase 2 optimizations if needed

---

*This plan addresses the fundamental architectural issue causing state loss while maintaining the plugin's dynamic nature and providing a foundation for future enhancements.*