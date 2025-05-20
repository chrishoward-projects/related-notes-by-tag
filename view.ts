import { ItemView, WorkspaceLeaf, TFile, getAllTags, Notice, MarkdownRenderer } from 'obsidian';
import RelatedNotesPlugin from './main';

export const RELATED_NOTES_VIEW_TYPE = 'related-notes-view';

export class RelatedNotesView extends ItemView {
  plugin: RelatedNotesPlugin;
  private container: HTMLElement;
  
  async handleSortChange(mode: 'name'|'date') {
    this.plugin.settings.defaultSortMode = mode;
    await this.plugin.saveSettings();
    this.updateView();
  }

  constructor(leaf: WorkspaceLeaf, plugin: RelatedNotesPlugin) {
    super(leaf);
    this.plugin = plugin;
    
    // Track modifier key state and mouse movement
    document.addEventListener('mousemove', this.trackMousePosition);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  private trackMousePosition = (e: MouseEvent) => {
    this.lastMousePosition = { x: e.clientX, y: e.clientY };
  };

  getViewType(): string {
    return RELATED_NOTES_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Related Notes';
  }

  getIcon(): string {
    return 'tag'; // Obsidian icon name for tags
  }

  async onOpen() {
    this.container = this.contentEl; // Use contentEl provided by ItemView
    this.container.empty();
    this.container.addClass('related-notes-container');
    this.container.createEl('h4', { text: this.plugin.settings.customSidebarTitle || 'Related Notes' });
    // Initial update
    this.updateView();
  }

  async onClose() {
    // Clean up event listeners and popups
    document.removeEventListener('mousemove', this.trackMousePosition);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.hidePreview();
    this.container.empty();
  }

  private isModifierHeld = false;
  private previewPopup: HTMLElement | null = null;
  private currentPreviewFile: TFile | null = null;

  private lastMousePosition = { x: 0, y: 0 };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.isModifierHeld = e.metaKey || e.ctrlKey;
    
    if (this.isModifierHeld) {
      // Use last tracked mouse position
      const hoveredElement = document.elementFromPoint(
        this.lastMousePosition.x, 
        this.lastMousePosition.y
      );
      const linkEl = hoveredElement?.closest('.related-note-link');
      
      if (linkEl instanceof HTMLElement && linkEl.dataset.filePath) {
        const file = this.app.vault.getAbstractFileByPath(linkEl.dataset.filePath);
        if (file instanceof TFile) {
          this.showPreview(file, linkEl);
        }
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.isModifierHeld = e.metaKey || e.ctrlKey;
    // Hide preview if modifier released while visible
    if (!this.isModifierHeld && this.previewPopup) {
      this.hidePreview();
    }
  };

  private showPreview(file: TFile, linkEl: HTMLElement) {
    this.hidePreview(); // Clear any existing preview
    
    // Create the popup in the document body instead of the container
    // This ensures it's not constrained by the container's layout
    this.previewPopup = document.body.createDiv('related-notes-preview');
    this.currentPreviewFile = file;
    
    // Simple positioning logic that prioritizes keeping the popup visible
    const linkRect = linkEl.getBoundingClientRect();
    const popupWidth = 400; // Slightly smaller width
    const popupMargin = 10;
    const viewportWidth = window.innerWidth; // Use window.innerWidth for true viewport width
    
    // Debug logging
    console.log('Link position:', linkRect);
    console.log('Viewport width:', viewportWidth);
    
    // Determine if popup should go left or right of the link
    let finalLeft: number;
    
    // Check if there's room to the right
    if (linkRect.right + popupWidth + popupMargin <= viewportWidth) {
      // Position to the right of the link
      finalLeft = linkRect.right + popupMargin;
      console.log('Positioning to right:', finalLeft);
    } 
    // Check if there's room to the left
    else if (linkRect.left - popupWidth - popupMargin >= 0) {
      // Position to the left of the link
      finalLeft = linkRect.left - popupWidth - popupMargin;
      console.log('Positioning to left:', finalLeft);
    } 
    // Not enough room on either side, center it or position it where most visible
    else {
      // Center it in the viewport if possible
      finalLeft = Math.max(popupMargin, Math.min(
        (viewportWidth - popupWidth) / 2, 
        viewportWidth - popupWidth - popupMargin
      ));
      console.log('Positioning centered:', finalLeft);
    }
    
    // Vertical positioning
    let finalTop = linkRect.top;
    const viewportHeight = window.innerHeight;
    
    // Set initial styles
    this.previewPopup.style.position = 'fixed';
    this.previewPopup.style.left = `${finalLeft}px`;
    this.previewPopup.style.top = `${finalTop}px`;
    this.previewPopup.style.zIndex = '9999';
    this.previewPopup.style.width = `${popupWidth}px`;
    this.previewPopup.style.maxHeight = '40hv';
    this.previewPopup.style.overflowY = 'auto';
    
    // Add close on click anywhere
    document.addEventListener('click', this.hidePreviewOnClick, { once: true });
    
    // Render markdown content
    // Add small delay and verify hover state before rendering

    setTimeout(() => {
      if (this.previewPopup && this.currentPreviewFile === file && this.isModifierHeld) {
        MarkdownRenderer.render(
          this.app,
          `![[${file.basename}]]`,
          this.previewPopup,
          file.path,
          this
        ).then(() => {
          this.previewPopup?.addClass('is-loaded');
          // Verify mouse is still over element after render
          if (!linkEl.matches(':hover') || !this.isModifierHeld) {
         //   this.hidePreview();
          }
        });
      }
    }, 150);
  }

  private hidePreview() {
    if (this.previewPopup) {
      this.previewPopup.remove();
      this.previewPopup = null;
      this.currentPreviewFile = null;
    }
  }

  private hidePreviewOnClick = () => {
    this.hidePreview();
  };

  async updateView() {
    if (!this.plugin.app.workspace.layoutReady) {
      return;
    }

    this.container.empty();
    this.container.addClass('related-notes-container');
    
    // Create header with sorting controls
    const headerEl = this.container.createDiv('related-notes-header');
    headerEl.createEl('h4', { text: this.plugin.settings.customSidebarTitle || 'Related Notes' });
    
    // Sorting controls
    const sortControls = headerEl.createDiv('sort-controls');
    ['name', 'date'].forEach(mode => {
      const button = sortControls.createEl('button', {
        text: mode.charAt(0).toUpperCase() + mode.slice(1),
        cls: `sort-button ${this.plugin.settings.defaultSortMode === mode ? 'is-active' : ''}`
      });
      button.addEventListener('click', () => this.handleSortChange(mode as 'name'|'date'));
    });

    const activeFile = this.app.workspace.getActiveFile();

    if (!activeFile || !(activeFile instanceof TFile)) {
      this.container.createEl('p', { text: 'No active note or not a markdown file.' });
      return; 
    } else {
      this.container.createEl('p', { text: activeFile.basename, cls: 'related-activefile-name' });
    }

    const fileCache = this.app.metadataCache.getFileCache(activeFile);
    if (!fileCache) {
      this.container.createEl('p', { text: 'Could not get file cache for the active note.' });
      return;
    }

    const currentNoteTags = getAllTags(fileCache);
    if (!currentNoteTags || currentNoteTags.length === 0) {
      this.container.createEl('p', { text: 'Active note has no tags.' });
      return;
    }

    // For Phase 1, we'll just list tags of the current note.
    // Actual search for related notes will be more complex.
    // Process excluded tags
    const excludedTags = this.plugin.settings.excludedTags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    // Filter out excluded tags and remove duplicates
    const uniqueCurrentTags = [...new Set(currentNoteTags)]
      .filter(tag => !excludedTags.includes(tag.toLowerCase()));

    const allMarkdownFiles = this.app.vault.getMarkdownFiles();
    const relatedNotesMap = new Map<string, TFile[]>(); // Tag -> Files

    for (const file of allMarkdownFiles) {
      if (file.path === activeFile.path) continue; // Skip current file

      const cache = this.app.metadataCache.getFileCache(file);
      if (cache) {
        const tagsInFile = getAllTags(cache);
        if (tagsInFile) {
          const uniqueTagsInFile = [...new Set(tagsInFile)];
          for (const tag of uniqueCurrentTags) {
            if (uniqueTagsInFile.includes(tag)) {
              if (!relatedNotesMap.has(tag)) {
                relatedNotesMap.set(tag, []);
              }
              relatedNotesMap.get(tag)?.push(file);
            }
          }
        }
      }
    }

    if (relatedNotesMap.size === 0) {
      this.container.createEl('p', { text: 'No other notes found with matching tags.' });
      return;
    }

    // Display notes grouped by tag
    relatedNotesMap.forEach((files, tag) => {
      const tagGroupEl = this.container.createDiv({ 
        cls: `related-notes-tag-group ${this.plugin.settings.defaultGroupState}`
      });
      const headerEl = tagGroupEl.createEl('div', { text: `Notes with tag: ${tag}`, cls: 'related-notes-tag-group-header' });
      const listEl = tagGroupEl.createEl('ul', { cls: 'related-notes-list' });
      listEl.style.display = this.plugin.settings.defaultGroupState === 'collapsed' ? 'none' : '';

      headerEl.addEventListener('click', () => {
        tagGroupEl.toggleClass('collapsed', !tagGroupEl.hasClass('collapsed'));
        if (tagGroupEl.hasClass('collapsed')) {
          listEl.style.display = 'none';
        } else {
          listEl.style.display = ''; // Or 'block', depending on default UL styling
        }
      });

      // Sort files based on current mode
      if (this.plugin.settings.defaultSortMode === 'date') {
        files.sort((a, b) => b.stat.mtime - a.stat.mtime); // Newest first
      } else {
        files.sort((a, b) => a.basename.localeCompare(b.basename));
      }

      files.forEach(file => {
        const listItemEl = listEl.createEl('li', { cls: 'related-notes-list-item' });


        const linkEl = listItemEl.createEl('a', {
          text: file.basename,
          href: '#',
          title: 'Hold Cmd/Ctrl + hover to preview\nClick to open',
          cls: 'related-note-link'
        });
        linkEl.dataset.filePath = file.path;
        
        // Hover handlers
        linkEl.addEventListener('mouseenter', (e: MouseEvent) => {
          if (e.metaKey || e.ctrlKey || this.isModifierHeld) {
            this.showPreview(file, linkEl);
          }
        });
        
        // Removed mousemove handler to prevent positioning conflicts

        // Update preview when modifier is pressed while hovering
        linkEl.addEventListener('keydown', (e) => {
          if ((e.metaKey || e.ctrlKey) && linkEl.matches(':hover')) {
            this.showPreview(file, linkEl);
          }
        });
        
        // linkEl.addEventListener('mouseleave', () => {
        //   //this.hidePreview();
        // });

        linkEl.addEventListener('click', (evt: MouseEvent) => {
          evt.preventDefault(); // It's good practice to keep this for anchor tags used as buttons
          // Use a different method to open the file
          if (evt.ctrlKey || evt.metaKey) {
            this.app.workspace.getLeaf('tab').openFile(file,{active:true});
          } else {
            this.app.workspace.getLeaf().openFile(file,{active:true});
          }
        });
        

      });
    });
  }
}
