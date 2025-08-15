# Plan 7: Simple Collapse/Expand All Button

## Requirements Summary

A simple toggle button that controls all tag group expansion states without interfering with individual state preservation.

## Core Behavior

### 1. Button State Logic
- **Initial State**: Button is opposite of `defaultGroupState` setting
  - If `defaultGroupState = "collapsed"` → Button shows "Expand All" (down chevron)
  - If `defaultGroupState = "expanded"` → Button shows "Collapse All" (right chevron)

### 2. Button Independence
- **Manual Toggles**: Button state is unaffected by user manually toggling individual tag groups
- **No Complex State Tracking**: Button doesn't try to reflect current DOM state

### 3. Button Action
- **When Clicked**: Loop through each visible tag group and update its open/closed state
- **State Updates**: Toggle button state immediately after click
- **Preserved State Cleanup**: Remove any affected tag groups from `tagGroupStates` Map

### 4. State Preservation
- **Individual States**: Only manual individual toggles should preserve state
- **Button States**: UI naturally preserves button state per note (testing required)
- **No Complex Logic**: Don't update preserved states in any other way

## Visual Design

### Icons
- **Collapse All**: Right-pointing chevron (►) - matches Obsidian file browser collapsed folders
- **Expand All**: Down-pointing chevron (▼) - matches Obsidian file browser expanded folders

### Button Appearance
- Positioned alongside existing sort, filter, and tags controls
- Consistent styling with other control buttons
- Clear tooltip indicating action

## Implementation Plan

### Phase 1: Basic Button Implementation

#### 1. Add Button State Property
```typescript
// Add to RelatedNotesView class
private isExpandAllMode: boolean = false; // true = expand all, false = collapse all
```

#### 2. Create Button in UIRenderer
```typescript
createExpandCollapseButton(
  container: HTMLElement,
  isExpandMode: boolean,
  onToggle: (newMode: boolean) => void
): HTMLElement {
  const button = container.createEl('button', {
    cls: 'related-notes-expand-collapse clickable-icon',
    title: isExpandMode ? 'Expand all groups' : 'Collapse all groups'
  });
  
  this.updateExpandCollapseIcon(button, isExpandMode);
  
  button.addEventListener('click', () => {
    const newMode = !button.hasAttribute('data-expand-mode') || 
                    button.getAttribute('data-expand-mode') === 'false';
    onToggle(newMode);
  });
  
  return button;
}

updateExpandCollapseIcon(button: HTMLElement, isExpandMode: boolean): void {
  button.empty();
  button.setAttribute('data-expand-mode', isExpandMode.toString());
  button.setAttribute('title', isExpandMode ? 'Expand all groups' : 'Collapse all groups');
  
  const svg = button.createSvg('svg', {
    attr: { 
      class: 'svg-icon', 
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2'
    }
  });
  
  if (isExpandMode) {
    // Down chevron - expand all
    svg.createSvg('path', { attr: { d: 'M6 9l6 6 6-6' } });
  } else {
    // Right chevron - collapse all  
    svg.createSvg('path', { attr: { d: 'M9 18l6-6-6-6' } });
  }
}
```

#### 3. Initialize Button State
```typescript
// In renderControls()
private renderControls(headerEl: HTMLElement): void {
  // ... existing controls ...
  
  // Initialize button state based on defaultGroupState
  this.isExpandAllMode = this.plugin.settings.defaultGroupState === 'collapsed';
  
  this.expandCollapseButton = this.uiRenderer.createExpandCollapseButton(
    actionButtons,
    this.isExpandAllMode,
    (newMode) => this.handleExpandCollapseToggle(newMode)
  );
}
```

#### 4. Handle Button Click
```typescript
private handleExpandCollapseToggle(isExpandMode: boolean): void {
  // Update button state immediately
  this.isExpandAllMode = isExpandMode;
  this.uiRenderer.updateExpandCollapseIcon(this.expandCollapseButton, isExpandMode);
  
  // Apply to all current tag groups
  const tagGroups = this.container.querySelectorAll(`.${CSS_CLASSES.TAG_GROUP}`);
  
  tagGroups.forEach((group: HTMLElement) => {
    const shouldExpand = isExpandMode;
    group.toggleClass('collapsed', !shouldExpand);
    
    // Remove from preserved state if present
    const headerEl = group.querySelector(`.${CSS_CLASSES.TAG_GROUP_HEADER}`);
    if (headerEl?.textContent) {
      const tagName = headerEl.textContent.replace('Notes with tag: ', '');
      if (this.tagGroupStates.has(tagName)) {
        this.tagGroupStates.delete(tagName);
      }
    }
  });
}
```

### Phase 2: CSS Styling

#### Add Button Styles
```css
.related-notes-expand-collapse {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  color: var(--icon-color);
}

.related-notes-expand-collapse:hover {
  background-color: var(--background-modifier-hover);
}

.related-notes-expand-collapse .svg-icon {
  width: 16px;
  height: 16px;
}
```

## Testing Strategy

### Manual Testing Scenarios

1. **Initial State**
   - Open note with `defaultGroupState = "collapsed"` → Button shows expand (down chevron)
   - Open note with `defaultGroupState = "expanded"` → Button shows collapse (right chevron)

2. **Button Functionality**
   - Click expand → All groups expand, button changes to collapse
   - Click collapse → All groups collapse, button changes to expand

3. **Independence from Manual Toggles**
   - Manually toggle individual groups → Button state unchanged
   - Click button after manual toggles → All groups follow button action

4. **State Preservation Cleanup**
   - Manually collapse some groups (creates preserved states)
   - Click button → Affected groups removed from preserved state
   - Navigate away and back → Manual states gone, groups follow default behavior

5. **Cross-Note Behavior**
   - Set button to expand on Note A
   - Navigate to Note B → Test if button state preserved (implementation dependent)

## Success Criteria

✅ **Simple Logic**: Button behavior is predictable and independent  
✅ **Correct Icons**: Uses Obsidian-style chevrons matching file browser  
✅ **State Cleanup**: Removes affected groups from preserved state  
✅ **No Interference**: Manual toggles don't affect button state  
✅ **Visual Integration**: Consistent with existing control buttons  

## Edge Cases Handled

- No tag groups present: Button still functions (no-op)
- Mixed states after manual toggles: Button enforces its action regardless
- Rapid clicking: Button updates state immediately on each click

---

*This simplified approach removes all complex state tracking while providing intuitive bulk operations that work reliably.*