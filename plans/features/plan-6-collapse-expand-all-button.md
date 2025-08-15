# Plan 6: Collapse All/Expand All Toggle Button

## Feature Overview

Add a toggle button in the control bar that allows users to quickly collapse or expand all tag groups at once, complementing the existing individual tag group toggles.

## Problem Analysis

### Current State
- Users can individually toggle tag groups by clicking headers
- With many tag groups, it becomes tedious to collapse/expand all groups manually
- No bulk action capability for tag group management
- State preservation system is already in place from Plan 5

### User Experience Gap
- Power users with many tags need efficient bulk operations
- Common workflow: collapse all to get overview, then expand specific groups
- Current solution requires multiple clicks for bulk operations

## Solution Design

### UI Integration Strategy

**Button Placement**: Add to existing action buttons container alongside sort, filter, and tags toggle buttons

**Visual Design**: 
- Icon-based button with tooltip for space efficiency
- Toggle between "Collapse All" and "Expand All" states
- Visual state should reflect current overall collapse state

**Button States**:
1. **Collapse All** (chevron-up icon): When some/all groups are expanded
2. **Expand All** (chevron-down icon): When all groups are collapsed  
3. **Mixed State**: Default to "Collapse All" when groups have mixed states

### State Management Integration

**Leverage Existing System**: Build on the `tagGroupStates` Map from Plan 5 implementation

**State Detection Logic**:
```typescript
// Determine current overall state
private getOverallCollapseState(): 'all-collapsed' | 'all-expanded' | 'mixed' {
  const states = Array.from(this.tagGroupStates.values());
  
  if (states.length === 0) return 'all-expanded'; // No groups = expanded state
  if (states.every(collapsed => collapsed)) return 'all-collapsed';
  if (states.every(collapsed => !collapsed)) return 'all-expanded';
  return 'mixed';
}
```

**Button State Update Triggers**:
- After individual tag group toggles
- After DOM rebuilds (in restoreState)
- After bulk collapse/expand operations

## Implementation Plan

### Phase 1: Core Button Implementation

#### 1. Add Button Creation to UIRenderer

```typescript
// Add to ui-renderer.ts
createCollapseToggleButton(
  container: HTMLElement, 
  initialState: 'collapse-all' | 'expand-all',
  onToggle: (action: 'collapse-all' | 'expand-all') => void
): HTMLElement {
  const button = container.createEl('button', {
    cls: 'related-notes-collapse-toggle',
    title: initialState === 'collapse-all' ? 'Collapse all groups' : 'Expand all groups'
  });
  
  // Set initial icon
  this.updateCollapseButtonIcon(button, initialState);
  
  button.addEventListener('click', () => {
    const newAction = button.getAttribute('data-action') === 'collapse-all' 
      ? 'expand-all' 
      : 'collapse-all';
    onToggle(newAction);
  });
  
  return button;
}

private updateCollapseButtonIcon(button: HTMLElement, action: 'collapse-all' | 'expand-all'): void {
  button.empty();
  button.setAttribute('data-action', action);
  button.setAttribute('title', action === 'collapse-all' ? 'Collapse all groups' : 'Expand all groups');
  
  // Add appropriate icon (chevron-up for collapse, chevron-down for expand)
  const icon = action === 'collapse-all' ? 'chevron-up' : 'chevron-down';
  button.createSvg('svg', {
    attr: { class: 'svg-icon', viewBox: '0 0 24 24' }
  }).createSvg('path', {
    attr: { d: icon === 'chevron-up' ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5' }
  });
}
```

#### 2. Add Button to RelatedNotesView Controls

```typescript
// Modify renderControls() in view.ts
private renderControls(headerEl: HTMLElement): void {
  const actionButtons = this.uiRenderer.createActionButtonsContainer(headerEl);
  
  // Existing controls
  this.uiRenderer.createSortDropdown(
    actionButtons,
    this.plugin.settings.defaultSortMode,
    (mode) => this.handleSortChange(mode)
  );
  
  this.uiRenderer.createFilterDropdown(
    actionButtons,
    this.plugin.settings.defaultFilterMode,
    (mode) => this.handleFilterChange(mode)
  );
  
  this.uiRenderer.createTagsToggleButton(
    actionButtons,
    this.plugin.settings.showMatchedTags,
    (showTags) => this.handleTagsToggle(showTags)
  );
  
  // NEW: Collapse/Expand All button
  const initialState = this.determineInitialCollapseButtonState();
  this.collapseToggleButton = this.uiRenderer.createCollapseToggleButton(
    actionButtons,
    initialState,
    (action) => this.handleCollapseToggle(action)
  );
}
```

#### 3. Add State Management Methods

```typescript
// Add to RelatedNotesView class

private collapseToggleButton: HTMLElement | null = null;

private determineInitialCollapseButtonState(): 'collapse-all' | 'expand-all' {
  const overallState = this.getOverallCollapseState();
  return overallState === 'all-collapsed' ? 'expand-all' : 'collapse-all';
}

private getOverallCollapseState(): 'all-collapsed' | 'all-expanded' | 'mixed' {
  const states = Array.from(this.tagGroupStates.values());
  
  if (states.length === 0) return 'all-expanded';
  if (states.every(collapsed => collapsed)) return 'all-collapsed';
  if (states.every(collapsed => !collapsed)) return 'all-expanded';
  return 'mixed';
}

private handleCollapseToggle(action: 'collapse-all' | 'expand-all'): void {
  const shouldCollapse = action === 'collapse-all';
  
  // Update all states in memory
  this.tagGroupStates.forEach((_, tag) => {
    this.tagGroupStates.set(tag, shouldCollapse);
  });
  
  // Apply to current DOM
  const tagGroups = this.container.querySelectorAll(`.${CSS_CLASSES.TAG_GROUP}`);
  tagGroups.forEach((group: HTMLElement) => {
    group.toggleClass('collapsed', shouldCollapse);
  });
  
  // Update button state
  this.updateCollapseButtonState();
}

private updateCollapseButtonState(): void {
  if (!this.collapseToggleButton) return;
  
  const newState = this.determineInitialCollapseButtonState();
  this.uiRenderer.updateCollapseButtonIcon(this.collapseToggleButton, newState);
}
```

#### 4. Integration with Existing Toggle System

```typescript
// Modify setupTagGroupToggle to update button state
private setupTagGroupToggle(tagGroupEl: HTMLElement, headerEl: HTMLElement, tag: string): void {
  headerEl.addEventListener('click', () => {
    const willBeCollapsed = !tagGroupEl.hasClass('collapsed');
    tagGroupEl.toggleClass('collapsed', willBeCollapsed);
    
    // Update state map
    this.tagGroupStates.set(tag, willBeCollapsed);
    
    // NEW: Update collapse/expand all button state
    this.updateCollapseButtonState();
  });
}

// Modify restoreState to update button
private restoreState(): void {
  // ... existing restoration logic ...
  
  // NEW: Update button state after restoration
  this.updateCollapseButtonState();
}
```

### Phase 2: Enhanced State Handling

#### 1. Handle New Groups After Button Click

```typescript
// Modify renderTagGroups to respect bulk action state
private renderTagGroups(relatedNotesMap: Map<string, FileWithMatchedTags[]>): void {
  relatedNotesMap.forEach((files, tag) => {
    let savedState = this.tagGroupStates.get(tag);
    
    // If no saved state exists, check if there was a recent bulk action
    if (savedState === undefined) {
      const overallState = this.getOverallCollapseState();
      savedState = overallState === 'all-collapsed' ? true : 
                   this.plugin.settings.defaultGroupState === 'collapsed';
    }
    
    // ... rest of rendering logic
  });
}
```

#### 2. Add Settings Integration (Optional)

```typescript
// Add to settings.ts if user wants to persist bulk state preference
export interface RelatedNotesSettings {
  // ... existing settings
  rememberBulkCollapseState: boolean; // Default: false
  lastBulkAction: 'collapse-all' | 'expand-all' | null; // Default: null
}
```

### Phase 3: Polish and Edge Cases

#### 1. Accessibility Improvements

```typescript
// Add ARIA attributes and keyboard support
createCollapseToggleButton(container: HTMLElement, ...): HTMLElement {
  const button = container.createEl('button', {
    cls: 'related-notes-collapse-toggle',
    attr: {
      'aria-label': 'Toggle all tag groups',
      'role': 'button',
      'tabindex': '0'
    }
  });
  
  // Add keyboard support
  button.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      button.click();
    }
  });
  
  return button;
}
```

#### 2. Animation Coordination (Future Enhancement)

```typescript
// Stagger collapse/expand animations for visual appeal
private async handleCollapseToggle(action: 'collapse-all' | 'expand-all'): void {
  const shouldCollapse = action === 'collapse-all';
  const tagGroups = this.container.querySelectorAll(`.${CSS_CLASSES.TAG_GROUP}`);
  
  // Update states immediately
  this.tagGroupStates.forEach((_, tag) => {
    this.tagGroupStates.set(tag, shouldCollapse);
  });
  
  // Apply with staggered timing for visual effect
  tagGroups.forEach((group: HTMLElement, index) => {
    setTimeout(() => {
      group.toggleClass('collapsed', shouldCollapse);
    }, index * 50); // 50ms stagger between groups
  });
  
  this.updateCollapseButtonState();
}
```

## CSS Requirements

```css
/* Add to styles.css */
.related-notes-collapse-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.related-notes-collapse-toggle:hover {
  background-color: var(--background-modifier-hover);
}

.related-notes-collapse-toggle .svg-icon {
  width: 16px;
  height: 16px;
}
```

## Testing Strategy

### Manual Testing Scenarios

1. **Basic Functionality**
   - Click collapse all → verify all groups collapse
   - Click expand all → verify all groups expand
   - Verify button icon/tooltip updates correctly

2. **Integration with Individual Toggles**
   - Collapse all, then expand one group → button should show "Collapse All"
   - Expand all, then collapse one group → button should show "Expand All"
   - Mixed state scenarios → button behavior

3. **State Persistence**
   - Collapse all, navigate to different note → state should persist per global strategy
   - Individual group states should be preserved
   - Button state should reflect current overall state

4. **Edge Cases**
   - No tag groups present → button should be disabled or hidden
   - Single tag group → button should work normally
   - Rapid clicking → no UI glitches

5. **Accessibility**
   - Keyboard navigation works
   - Screen reader compatibility
   - Focus indicators visible

## Success Criteria

✅ **Functional Requirements**
- Button toggles between collapse/expand all states
- All tag groups respond to bulk action
- Individual toggles continue working and update button state
- State integrates seamlessly with existing state management

✅ **User Experience Requirements**  
- Button is discoverable and intuitive
- Visual feedback is clear and immediate
- No performance degradation with many tag groups
- Consistent behavior across different notes

✅ **Technical Requirements**
- No breaking changes to existing functionality
- Code follows existing patterns and architecture
- Proper TypeScript typing
- Lint and build pass successfully

## Future Enhancements

1. **Smart Bulk Actions**
   - "Collapse all except current" - collapse all but keep groups with current note's tags expanded
   - Remember frequently used groups and exclude from bulk collapse

2. **Keyboard Shortcuts**
   - Add hotkey for bulk collapse/expand (e.g., Ctrl+Shift+C/E)

3. **Animation Polish**
   - Smooth animations for bulk operations
   - Staggered timing for visual appeal

4. **Context Menu Integration**
   - Right-click context menu on button for additional options

## Implementation Benefits

✅ **User Productivity**: Significantly reduces clicks needed for bulk tag group management  
✅ **Power User Support**: Enables efficient workflows for users with many tags  
✅ **Consistent UX**: Follows existing control button patterns and behaviors  
✅ **State Harmony**: Integrates seamlessly with individual toggle and state preservation systems  
✅ **Accessibility**: Supports keyboard navigation and screen readers  
✅ **Maintainable**: Builds on existing architecture without adding complexity

---

*This plan extends the state management foundation from Plan 5 to provide efficient bulk operations while maintaining the intuitive individual control experience.*