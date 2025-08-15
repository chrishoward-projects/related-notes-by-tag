import { CSS_CLASSES, ICONS, SORT_LABELS, FILTER_LABELS, SORT_MODES, FILTER_MODES } from './constants';

export interface DropdownOption {
  value: string | number;
  label: string;
  isActive: boolean;
}

export interface DropdownConfig {
  icon: string;
  options: DropdownOption[];
  onItemClick: (value: string | number) => void;
  containerClass?: string;
}

export class UIRenderer {
  private openDropdowns: Set<HTMLElement> = new Set();

  constructor() {
    // Global click handler to close dropdowns when clicking outside
    document.addEventListener('click', this.handleGlobalClick);
  }

  private handleGlobalClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if the click is outside all dropdown containers
    let isInsideDropdown = false;
    for (const dropdown of this.openDropdowns) {
      if (dropdown.contains(target)) {
        isInsideDropdown = true;
        break;
      }
    }
    
    // If click is outside, close all dropdowns
    if (!isInsideDropdown) {
      this.closeAllDropdowns();
    }
  };

  private closeAllDropdowns() {
    this.openDropdowns.forEach(dropdown => {
      const menu = dropdown.querySelector(`.${CSS_CLASSES.DROPDOWN_MENU}`);
      if (menu) {
        menu.classList.remove(CSS_CLASSES.DROPDOWN_VISIBLE);
      }
    });
  }
  createDropdown(container: HTMLElement, config: DropdownConfig): HTMLElement {
    const dropdownContainer = container.createDiv(CSS_CLASSES.DROPDOWN_CONTAINER);
    if (config.containerClass) {
      dropdownContainer.addClass(config.containerClass);
    }
    
    const trigger = dropdownContainer.createEl('button', {
      cls: `${CSS_CLASSES.DROPDOWN_TRIGGER} clickable-icon`
    });
    // Create SVG element from icon string using DOM parser
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(config.icon, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;
    trigger.appendChild(svgElement);
    
    const menu = dropdownContainer.createDiv(CSS_CLASSES.DROPDOWN_MENU);
    
    config.options.forEach(option => {
      const item = menu.createEl('div', {
        cls: `${CSS_CLASSES.DROPDOWN_ITEM} ${option.isActive ? CSS_CLASSES.DROPDOWN_ITEM_ACTIVE : ''}`,
        text: option.label
      });
      
      item.addEventListener('click', () => {
        config.onItemClick(option.value);
        menu.classList.remove(CSS_CLASSES.DROPDOWN_VISIBLE);
        
        // Update active states
        menu.querySelectorAll(`.${CSS_CLASSES.DROPDOWN_ITEM}`).forEach(el => 
          el.classList.remove(CSS_CLASSES.DROPDOWN_ITEM_ACTIVE)
        );
        item.classList.add(CSS_CLASSES.DROPDOWN_ITEM_ACTIVE);
      });
    });
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close all other dropdowns first
      this.closeAllDropdowns();
      
      // Then toggle this one
      menu.classList.toggle(CSS_CLASSES.DROPDOWN_VISIBLE);
      
      // Track this dropdown if it's now open
      if (menu.classList.contains(CSS_CLASSES.DROPDOWN_VISIBLE)) {
        this.openDropdowns.add(dropdownContainer);
      } else {
        this.openDropdowns.delete(dropdownContainer);
      }
    });
    
    return dropdownContainer;
  }

  createSortDropdown(
    container: HTMLElement, 
    currentMode: string, 
    onSortChange: (mode: 'name' | 'date' | 'created') => void
  ): HTMLElement {
    const options: DropdownOption[] = [
      { value: SORT_MODES.NAME, label: SORT_LABELS[SORT_MODES.NAME], isActive: currentMode === SORT_MODES.NAME },
      { value: SORT_MODES.DATE, label: SORT_LABELS[SORT_MODES.DATE], isActive: currentMode === SORT_MODES.DATE },
      { value: SORT_MODES.CREATED, label: SORT_LABELS[SORT_MODES.CREATED], isActive: currentMode === SORT_MODES.CREATED }
    ];

    return this.createDropdown(container, {
      icon: ICONS.SORT,
      options,
      onItemClick: (value) => onSortChange(value as 'name' | 'date' | 'created'),
      containerClass: CSS_CLASSES.SORT_CONTROLS
    });
  }

  createFilterDropdown(
    container: HTMLElement, 
    currentMode: number, 
    onFilterChange: (mode: 1 | 2 | 3) => void
  ): HTMLElement {
    const options: DropdownOption[] = [
      { value: FILTER_MODES.ONE_TAG, label: FILTER_LABELS[FILTER_MODES.ONE_TAG], isActive: currentMode === FILTER_MODES.ONE_TAG },
      { value: FILTER_MODES.TWO_TAGS, label: FILTER_LABELS[FILTER_MODES.TWO_TAGS], isActive: currentMode === FILTER_MODES.TWO_TAGS },
      { value: FILTER_MODES.THREE_TAGS, label: FILTER_LABELS[FILTER_MODES.THREE_TAGS], isActive: currentMode === FILTER_MODES.THREE_TAGS }
    ];

    return this.createDropdown(container, {
      icon: ICONS.FILTER,
      options,
      onItemClick: (value) => onFilterChange(value as 1 | 2 | 3),
      containerClass: CSS_CLASSES.FILTER_CONTROLS
    });
  }

  createHeader(container: HTMLElement): HTMLElement {
    const headerEl = container.createDiv(CSS_CLASSES.HEADER);
    return headerEl;
  }

  createActionButtonsContainer(headerEl: HTMLElement): HTMLElement {
    return headerEl.createDiv(CSS_CLASSES.ACTION_BUTTONS);
  }

  createTagsToggleButton(
    container: HTMLElement, 
    isActive: boolean, 
    onToggle: (showTags: boolean) => void
  ): HTMLElement {
    const toggleButton = container.createEl('button', {
      cls: `${CSS_CLASSES.DROPDOWN_TRIGGER} ${CSS_CLASSES.TAGS_TOGGLE_CONTROLS} clickable-icon ${isActive ? CSS_CLASSES.DROPDOWN_ITEM_ACTIVE : ''}`,
      title: isActive ? 'Hide matched tags' : 'Show matched tags'
    });
    
    // Create SVG element from icon string using DOM parser
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(ICONS.TAGS_TOGGLE, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;
    toggleButton.appendChild(svgElement);
    
    toggleButton.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close all dropdowns when toggle button is clicked
      this.closeAllDropdowns();
      
      const newState = !isActive;
      onToggle(newState);
      
      // Update button appearance
      if (newState) {
        toggleButton.addClass(CSS_CLASSES.DROPDOWN_ITEM_ACTIVE);
        toggleButton.title = 'Hide matched tags';
      } else {
        toggleButton.removeClass(CSS_CLASSES.DROPDOWN_ITEM_ACTIVE);
        toggleButton.title = 'Show matched tags';
      }
    });
    
    return toggleButton;
  }

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
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close all dropdowns when button is clicked
      this.closeAllDropdowns();
      
      const currentMode = button.getAttribute('data-expand-mode') === 'true';
      const newMode = !currentMode;
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
      // Up chevron - expand all (show content)
      svg.createSvg('path', { attr: { d: 'M18 15l-6-6-6 6' } });
    } else {
      // Down chevron - collapse all (hide content)
      svg.createSvg('path', { attr: { d: 'M6 9l6 6 6-6' } });
    }
  }

  cleanup() {
    document.removeEventListener('click', this.handleGlobalClick);
    this.openDropdowns.clear();
  }
}