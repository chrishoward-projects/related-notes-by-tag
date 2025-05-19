import { ItemView, WorkspaceLeaf, TFile, getAllTags, Notice } from 'obsidian';
import RelatedNotesPlugin from './main'; // Adjust if main.ts is named differently

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
  }

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
    // Perform any cleanup needed when the view is closed
    this.container.empty();
  }

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
          title: 'ctrl/cmd click to open in new tab'
        });
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
