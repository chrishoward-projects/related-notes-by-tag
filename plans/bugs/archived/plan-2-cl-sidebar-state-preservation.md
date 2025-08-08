# Plan 2 (CL) Sidebar State Preservation

I've analyzed the codebase and identified the root cause of the bug you're experiencing. Here's what's happening and my plan to fix it:

## Problem Analysis

The issue occurs because the `updateView()` method in `view.ts` completely rebuilds the entire sidebar DOM structure every time it's called. This happens when:

1. **Active leaf changes** - When you click outside the sidebar to focus on a different note
2. **File metadata changes** - When the active file's tags or content are modified
3. **Settings changes** - When any plugin settings are updated

The current flow is:
1. User expands/collapses tag groups (state stored in DOM via CSS classes)
2. User clicks outside sidebar → `active-leaf-change` event fires
3. `updateView()` is called → `container.empty()` destroys all DOM elements
4. Sidebar is completely rebuilt with default states → all collapse/expand states are lost

## Solution Plan

I propose implementing a **state persistence system** that preserves the collapse/expand state of tag groups across view updates. Here's my approach:

### 1. Add State Management to Settings
- Add a new `tagGroupStates` property to `RelatedNotesSettings` interface
- This will store a map of tag names to their collapse/expand states
- Format: `{ [tagName: string]: 'collapsed' | 'expanded' }`

### 2. Capture State Before DOM Rebuild
- Before calling `container.empty()` in `updateView()`, scan existing tag groups
- Extract current collapse/expand state from DOM classes
- Store this state in the settings (in memory, not persisted to disk for performance)

### 3. Restore State After DOM Rebuild
- After creating new tag group elements, apply the stored states
- Use the stored state to set the appropriate CSS classes on new elements
- Fall back to `defaultGroupState` setting for new tags that don't have stored state

### 4. Update State on User Interactions
- Modify the `setupTagGroupToggle()` method to update the stored state when users manually toggle groups
- This ensures the state is always current

### 5. State Cleanup
- Periodically clean up stored states for tags that no longer exist
- This prevents the state map from growing indefinitely

## Implementation Benefits

1. **Preserves User Experience**: Tag group states persist across all view updates
2. **Maintains Dynamic Nature**: The plugin remains fully dynamic and responsive to file changes
3. **Performance Friendly**: State is stored in memory, not written to disk on every change
4. **Backward Compatible**: Existing functionality remains unchanged
5. **Handles Edge Cases**: New tags use default state, removed tags are cleaned up

## Alternative Approaches Considered

1. **Partial DOM Updates**: Only update changed content instead of full rebuild
   - More complex to implement correctly
   - Risk of DOM inconsistencies
   - Current full rebuild ensures data accuracy

2. **Session Storage**: Store state in browser session storage
   - Would persist across Obsidian restarts (may not be desired)
   - Less integrated with plugin architecture

3. **Event-Based State Management**: Use custom events to coordinate state
   - Adds complexity without significant benefits
   - Current approach is more straightforward

The proposed solution maintains the plugin's dynamic nature while solving the state persistence issue. It's a clean, maintainable approach that integrates well with the existing architecture.