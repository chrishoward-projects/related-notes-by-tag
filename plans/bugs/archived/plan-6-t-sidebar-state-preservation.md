# Plan 6 (T) Sidebar State Preservation

## Problem Analysis

### Root Cause
Tag group collapse/expand states are lost during view updates because:

1. **Triggers**: 
   - User clicks outside sidebar → `active-leaf-change` event fires
   - User changes notes → `active-leaf-change` event fires
   - Metadata updates → view refresh triggered
2. **Handler**: Event handler in `main.ts:33-48` calls `updateView()`
3. **DOM Reset**: `updateView()` calls `container.empty()` in `view.ts:73`
4. **State Loss**: All tag groups rebuilt from scratch, losing collapse/expand states
5. **Default State**: Groups revert to `settings.defaultGroupState`

### Current State Management
- Tag group states stored only in DOM CSS classes (`collapsed`)
- No persistence layer between view updates
- Dynamic updates always rebuild entire DOM

## Solution Design

### State Persistence Architecture

**Memory Storage Layer**
- Add `private tagGroupStates: Map<string, boolean>` to `RelatedNotesView`
- Key: tag name (stable identifier)
- Value: `true` = collapsed, `false` = expanded
- Memory-only storage (acceptable UX - resets on plugin reload)

**State Capture & Restoration Flow**
```
updateView() {
  1. captureTagGroupStates() // Scan current DOM before clearing
  2. container.empty()       // Clear DOM as usual
  3. // ... rebuild content
  4. restoreTagGroupStates() // Apply stored states to new DOM
}
```

### Implementation Components

#### 1. State Capture Method
```typescript
private captureTagGroupStates(): void {
  // Scan existing tag groups for collapse states
  // Store in this.tagGroupStates Map
}
```

#### 2. State Restoration Method  
```typescript
private restoreTagGroupStates(): void {
  // Apply stored states to newly created tag groups
  // Fall back to settings.defaultGroupState for unknown tags
}
```

#### 3. Toggle Handler Enhancement
```typescript
private setupTagGroupToggle(tagGroupEl, headerEl): void {
  // Update both DOM classes AND tagGroupStates Map
  // Ensures persistence across updates
}
```

#### 4. Integration Points
- Modify `updateView()` to capture→rebuild→restore
- Update toggle handler to persist to memory
- Use tag names as stable identifiers

### Technical Decisions

**Storage Strategy**: Memory-only (Map)
- Pro: Simple, fast, no serialization complexity
- Con: Resets on plugin reload (acceptable UX)
- Alternative: Could extend to settings persistence later if needed

**State Identification**: Tag names as keys
- Pro: Stable across updates, human-readable
- Pro: Natural grouping mechanism
- Pro: Global state across all notes (consistent user experience)
- Con: Could theoretically have conflicts (very unlikely)

**State Scope**: Global tag state across all notes
- Collapsed "work" tag stays collapsed regardless of which note is active
- Provides consistent behavior when switching between notes
- Simplifies implementation compared to per-note state tracking
- More intuitive user experience

**Fallback Logic**: Settings-based defaults
- Unknown tags use `settings.defaultGroupState`
- Maintains current behavior for new content
- Graceful degradation

## Implementation Plan

### Phase 1: Core Infrastructure
1. Add `tagGroupStates` Map to RelatedNotesView class
2. Create `captureTagGroupStates()` method
3. Create `restoreTagGroupStates()` method

### Phase 2: Integration
4. Modify `updateView()` to use capture/restore flow
5. Update `setupTagGroupToggle()` to persist state changes
6. Test with various scenarios (new tags, removed tags, etc.)

### Phase 3: Edge Case Handling
7. Handle tag renames/changes gracefully
8. Cleanup stale state entries if needed
9. Ensure memory doesn't grow unbounded
10. Test note switching scenarios (rapid switching, different tag sets)
11. Verify consistent state behavior across note changes

## Expected Outcome

**User Experience**
- Tag group collapse/expand states persist when clicking outside sidebar
- States persist during active file changes and metadata updates
- States persist when switching between notes (global tag behavior)
- Consistent tag group states regardless of which note triggered the tag group
- New tag groups use default state from settings
- State resets on plugin reload (acceptable behavior)

**Technical Benefits**
- Maintains existing dynamic update behavior
- No breaking changes to current functionality  
- Simple, maintainable solution
- Easy to extend to settings persistence later if desired

## Files to Modify

- `src/view.ts`: Add state management logic
- No changes needed to settings, constants, or other files
- Purely additive enhancement

## Testing Strategy

1. **State Persistence**: Collapse groups → click outside → verify states maintained
2. **Note Switching**: Collapse groups → switch notes → switch back → verify states maintained
3. **Cross-Note Consistency**: Collapse "work" tag in Note A → switch to Note B with "work" tag → verify "work" is collapsed
4. **New Content**: Add new tags → verify they use default state
5. **Mixed States**: Some collapsed, some expanded → verify individual persistence
6. **Edge Cases**: Fast switching between files, metadata changes during interaction
7. **Tag Overlap**: Notes with overlapping and non-overlapping tag sets