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
  createDropdown(container: HTMLElement, config: DropdownConfig): HTMLElement {
    const dropdownContainer = container.createDiv(CSS_CLASSES.DROPDOWN_CONTAINER);
    if (config.containerClass) {
      dropdownContainer.addClass(config.containerClass);
    }
    
    const trigger = dropdownContainer.createEl('button', {
      cls: CSS_CLASSES.DROPDOWN_TRIGGER
    });
    trigger.innerHTML = config.icon;
    
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
      menu.classList.toggle(CSS_CLASSES.DROPDOWN_VISIBLE);
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

  createHeader(container: HTMLElement, title: string): HTMLElement {
    const headerEl = container.createDiv(CSS_CLASSES.HEADER);
    headerEl.createEl('h4', { 
      text: title, 
      cls: CSS_CLASSES.TITLE 
    });
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
      cls: `${CSS_CLASSES.DROPDOWN_TRIGGER} ${CSS_CLASSES.TAGS_TOGGLE_CONTROLS} ${isActive ? CSS_CLASSES.DROPDOWN_ITEM_ACTIVE : ''}`,
      title: isActive ? 'Hide matched tags' : 'Show matched tags'
    });
    
    toggleButton.innerHTML = ICONS.TAGS_TOGGLE;
    
    toggleButton.addEventListener('click', (e) => {
      e.stopPropagation();
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
}