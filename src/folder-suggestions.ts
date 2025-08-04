import { App } from 'obsidian';

export class FolderSuggestions {
  constructor(private app: App) {}

  /**
   * Search for folders matching a query
   */
  public async searchFolders(query: string): Promise<string[]> {
    if (!query) return [];
    
    const folders = this.app.vault.getAllFolders();
    
    let folderPaths = folders.map(folder => {
      // Ensure leading slash for consistency with our path normalization
      return folder.path === '/' ? '/' : (folder.path.startsWith('/') ? folder.path : '/' + folder.path);
    });
    
    // Apply search query filter
    folderPaths = folderPaths
      .filter(path => path.toLowerCase().includes(query.toLowerCase()))
      .sort();
    
    return folderPaths;
  }

  /**
   * Display folder suggestions dropdown
   */
  public displayFolderSuggestions(folders: string[]) {
    // Clear previous suggestions
    const existingSuggestions = document.querySelectorAll('.folder-suggestions-container');
    existingSuggestions.forEach(el => el.remove());

    if (folders.length === 0) return;

    // Find the active input element that triggered this
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLInputElement)) {
      return;
    }

    // Find the parent .setting-item-control element
    const settingItemControl = activeElement.closest('.setting-item-control');
    if (!settingItemControl) {
      return;
    }
    
    // Set position:relative on the parent element to make absolute positioning work
    (settingItemControl as HTMLElement).style.position = 'relative';
    
    console.log('Setting up suggestions container with parent:', settingItemControl);

    // Create a new suggestions container
    const newContainer = document.createElement('div');
    newContainer.className = 'folder-suggestions-container';
    newContainer.style.position = 'absolute';
    newContainer.style.backgroundColor = 'var(--background-primary)';
    newContainer.style.border = '1px solid var(--background-modifier-border)';
    newContainer.style.borderRadius = '4px';
    newContainer.style.zIndex = '1000';
    newContainer.style.boxShadow = '0 2px 8px var(--background-modifier-box-shadow)';

    // Add suggestions to the container
    folders.forEach(folder => {
      const suggestionItem = document.createElement('div');
      suggestionItem.className = 'folder-suggestion-item';
      suggestionItem.textContent = folder;
      suggestionItem.style.padding = '8px 12px';
      suggestionItem.style.cursor = 'pointer';
      suggestionItem.style.transition = 'background-color 0.1s ease';
      suggestionItem.style.textAlign = 'left';

      // Hover effect
      suggestionItem.addEventListener('mouseover', () => {
        suggestionItem.style.backgroundColor = 'var(--background-modifier-hover)';
      });
      suggestionItem.addEventListener('mouseout', () => {
        suggestionItem.style.backgroundColor = '';
      });

      // Click event
      suggestionItem.addEventListener('click', () => {
        // Set the value of the input field
        (activeElement as HTMLInputElement).value = folder;
        
        // Trigger an input event to ensure onChange handlers fire
        const event = new Event('input', { bubbles: true });
        activeElement.dispatchEvent(event);
        
        // Remove the suggestions container
        newContainer.remove();
      });

      newContainer.appendChild(suggestionItem);
    });

    // Position the suggestions container relative to the input element
    const rect = activeElement.getBoundingClientRect();
    
    // Append to the setting-item-control for proper positioning
    settingItemControl.appendChild(newContainer);
    
    // Position below the input field and align to the right
    newContainer.style.position = 'absolute';
    newContainer.style.left = ''; // Clear any left value
    newContainer.style.right = '0'; // Align to the right edge
    newContainer.style.top = `${rect.height + 4}px`; // Position below input with small gap
    newContainer.style.width = `${rect.width}px`;
    newContainer.style.maxHeight = '200px';
    newContainer.style.overflowY = 'auto';
    newContainer.style.overflowX = 'hidden';
    
    // Force a reflow to ensure styles are applied
    void newContainer.offsetHeight;
    
    // Double-check that right alignment is maintained
    console.log('Container styles after positioning:', {
      position: newContainer.style.position,
      right: newContainer.style.right,
      left: newContainer.style.left,
      top: newContainer.style.top,
      width: newContainer.style.width
    });
    
    // Add click outside listener
    const clickOutsideHandler = (e: MouseEvent) => {
      if (!newContainer.contains(e.target as Node) && e.target !== activeElement) {
        newContainer.remove();
        document.removeEventListener('click', clickOutsideHandler);
      }
    };
    
    // Delay adding the click listener to prevent immediate triggering
    setTimeout(() => {
      document.addEventListener('click', clickOutsideHandler);
    }, 0);
  }
}