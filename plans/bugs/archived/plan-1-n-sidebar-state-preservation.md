# Plan 1 (N) Sidebar State Preservation

## Problem Statement

When you click outside of the related notes sidebar, it resets the sidebar view. If you collapsed or expanded any tag groups, it loses that state. The plugin maintains its dynamic nature but loses user interaction state.

## Root Cause Analysis

The issue occurs because:

1. **Complete DOM Rebuild**: Every time `updateView()` is called (lines 68-95 in view.ts), it completely empties the container (`this.container.empty()`) and rebuilds the entire UI from scratch.

2. **Frequent Updates**: The view updates whenever:
   - Active file changes (main.ts:33-48)
   - File metadata changes (main.ts:51-59) 
   - Settings change (main.ts:86-91)

3. **Lost State**: Since the DOM is completely rebuilt, any collapse/expand state stored in CSS classes is lost.

## Solution Plan

Multi-layered approach to fix this while maintaining the dynamic nature:

### 1. **State Persistence Layer**
- Add a `ViewState` class to track which tag groups are collapsed/expanded
- Store state by tag name (since tags are the stable identifier)
- Persist state in memory during the session

### 2. **Smart UI Updates**
- Replace the "nuclear" `container.empty()` approach with selective updates
- Only rebuild sections that actually changed (new tags, removed tags, different files)
- Preserve existing DOM elements when possible

### 3. **Differential Rendering**
- Compare previous render state vs current state
- Only update changed tag groups
- Maintain collapse/expand state during partial updates

### 4. **State Restoration**
- When DOM elements must be rebuilt, immediately restore their collapse/expand state
- Apply the correct CSS classes based on stored state

### 5. **Debounced Updates**
- Add intelligent debouncing to prevent excessive updates
- Batch multiple rapid changes into single update

## Implementation Strategy

1. **Create ViewState Manager**: Track tag group states persistently
2. **Implement Differential Rendering**: Only update what changed
3. **Add State Restoration**: Apply saved states after DOM updates
4. **Optimize Update Triggers**: Reduce unnecessary full rebuilds
5. **Add Smart Caching**: Cache rendered elements when possible

## Key Insight

Move from "rebuild everything" to "update only what changed" while maintaining a persistent memory of user interactions (collapse/expand states).

This approach will preserve user interactions while keeping the dynamic functionality intact. The plugin will still respond to file changes, metadata updates, and setting changes, but won't lose the user's UI state in the process.

## Files to Modify

- `src/view.ts` - Main view logic, differential rendering
- Add new file: `src/view-state.ts` - State persistence manager
- `src/main.ts` - Potentially optimize update triggers
- `src/ui-renderer.ts` - May need updates for state restoration

## Success Criteria

- Tag group collapse/expand states persist across view updates
- Plugin maintains all existing dynamic functionality
- No performance degradation
- State is maintained during the session (doesn't need to persist between Obsidian restarts)