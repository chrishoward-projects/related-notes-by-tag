# Plan 3 (CR) Sidebar State Preservation

## Problem
When users click outside of the related notes sidebar, it resets the sidebar view. This causes any collapsed or expanded tag groups to lose their state, which is frustrating for users who have organized their view.

## Root Cause
The issue is in `main.ts` where the `active-leaf-change` event listener triggers `updateView()` which completely re-renders the sidebar:

```typescript
this.registerEvent(
  this.app.workspace.on('active-leaf-change', (activeLeaf) => {
    // ... checks ...
    setTimeout(async () => {
      const currentView = this.getView();
      if (currentView) {
        await currentView.updateView(); // This resets the UI state!
      }
    }, TIMEOUTS.VIEW_UPDATE_DELAY);
  })
);
```

## Solution Plan

### 1. **State Management Solution**
We need to preserve the collapsed/expanded state of tag groups across view updates. Implement a state management system that:

- Tracks which tag groups are collapsed/expanded
- Persists this state when the view is updated
- Restores the state after re-rendering

### 2. **Implementation Strategy**

**Option A: In-Memory State (Recommended)**
- Store collapsed state in the view instance
- Update the state when users click to collapse/expand
- Restore state after each `updateView()` call
- This is lightweight and doesn't require persistent storage

**Option B: Settings-Based State**
- Store collapsed state in plugin settings
- Persist across sessions
- More complex but provides persistent user preferences

### 3. **Code Changes Needed**

1. **Add state tracking to `RelatedNotesView`**:
   - Add a `collapsedTagGroups` Set to track which tags are collapsed
   - Modify `setupTagGroupToggle` to update this state
   - Modify `renderTagGroups` to restore state after rendering

2. **Modify the update logic**:
   - Preserve state before `updateView()`
   - Restore state after rendering

3. **Consider optimization**:
   - Only update when the active file actually changes
   - Add debouncing to prevent excessive updates

### 4. **Implementation Details**

#### In `RelatedNotesView` class:
```typescript
export class RelatedNotesView extends ItemView {
  // Add state tracking
  private collapsedTagGroups: Set<string> = new Set();
  
  // Modify updateView to preserve state
  async updateView() {
    // Store current state
    const currentCollapsedState = new Set(this.collapsedTagGroups);
    
    // ... existing update logic ...
    
    // Restore state after rendering
    this.restoreCollapsedState(currentCollapsedState);
  }
  
  // Add method to restore state
  private restoreCollapsedState(collapsedState: Set<string>) {
    // Apply collapsed state to rendered tag groups
  }
  
  // Modify setupTagGroupToggle to track state
  private setupTagGroupToggle(tagGroupEl: HTMLElement, headerEl: HTMLElement, tag: string) {
    // Update collapsedTagGroups when toggled
  }
}
```

### 5. **Benefits of This Approach**
- Maintains dynamic nature of the plugin
- Preserves user's UI preferences during the session
- Minimal performance impact
- Clean separation of concerns

### 6. **Future Enhancements**
- Consider persistent state across sessions (Option B)
- Add animation for smooth collapse/expand transitions
- Add "expand all" / "collapse all" buttons
- Remember scroll position within the sidebar

## Priority
**High** - This is a user experience issue that affects daily workflow.

## Estimated Effort
- **Option A**: 2-3 hours
- **Option B**: 4-6 hours (includes settings UI)

## Recommendation
Start with Option A (in-memory state) as it's simpler and addresses the immediate issue. We can always enhance it to Option B later if users request persistent state across sessions. 