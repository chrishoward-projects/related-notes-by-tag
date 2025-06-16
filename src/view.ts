import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import RelatedNotesPlugin from './main';
import { TagAnalyzer, FileWithMatchedTags } from './tag-analyzer';
import { PreviewManager } from './preview-manager';
import { UIRenderer } from './ui-renderer';
import { CSS_CLASSES } from './constants';

export const RELATED_NOTES_VIEW_TYPE = 'related-notes-view';

export class RelatedNotesView extends ItemView {
  plugin: RelatedNotesPlugin;
  private container: HTMLElement;
  private tagAnalyzer: TagAnalyzer;
  private previewManager: PreviewManager;
  private uiRenderer: UIRenderer;
  
  async handleSortChange(mode: 'name'|'date'|'created') {
    this.plugin.settings.defaultSortMode = mode;
    await this.plugin.saveSettings();
    this.updateView();
  }

  async handleFilterChange(filterMode: 1|2|3) {
    this.plugin.settings.defaultFilterMode = filterMode;
    await this.plugin.saveSettings();
    this.updateView();
  }

  async handleTagsToggle(showTags: boolean) {
    this.plugin.settings.showMatchedTags = showTags;
    await this.plugin.saveSettings();
    this.updateView();
  }

  constructor(leaf: WorkspaceLeaf, plugin: RelatedNotesPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.tagAnalyzer = new TagAnalyzer(this.app);
    this.previewManager = new PreviewManager(this.app);
    this.uiRenderer = new UIRenderer();
  }

  getViewType(): string {
    return RELATED_NOTES_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Related Notes';
  }

  getIcon(): string {
    return 'tag';
  }

  async onOpen() {
    this.container = this.contentEl;
    this.container.empty();
    this.container.addClass(CSS_CLASSES.CONTAINER);
    this.updateView();
  }

  async onClose() {
    this.previewManager.cleanup();
    this.uiRenderer.cleanup();
    this.container.empty();
  }

  async updateView() {
    if (!this.plugin.app.workspace.layoutReady) {
      return;
    }

    this.container.empty();
    this.container.addClass(CSS_CLASSES.CONTAINER);
    
    const headerEl = this.renderHeader();
    this.renderControls(headerEl);
    
    const activeFile = this.getActiveFile();
    if (!activeFile) return;
    
    const analysisResult = this.tagAnalyzer.analyzeRelatedNotes(activeFile, this.plugin.settings);
    
    if (analysisResult.currentNoteTags.length === 0) {
      this.container.createEl('p', { text: 'Active note has no tags.' });
      return;
    }
    
    if (analysisResult.relatedNotesMap.size === 0) {
      this.container.createEl('p', { text: 'No other notes found with matching tags.' });
      return;
    }
    
    this.renderTagGroups(analysisResult.relatedNotesMap);
  }

  private renderHeader(): HTMLElement {
    const headerEl = this.uiRenderer.createHeader(this.container);
    return headerEl;
  }

  private renderControls(headerEl: HTMLElement): void {
    const actionButtons = this.uiRenderer.createActionButtonsContainer(headerEl);
    
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
  }

  private getActiveFile(): TFile | null {
    const activeFile = this.app.workspace.getActiveFile();
    
    if (!activeFile || !(activeFile instanceof TFile)) {
      this.container.createEl('p', { text: 'No active note or not a markdown file.' });
      return null;
    }
    
    return activeFile;
  }

  private renderTagGroups(relatedNotesMap: Map<string, FileWithMatchedTags[]>): void {
    relatedNotesMap.forEach((files, tag) => {
      const tagGroupEl = this.container.createDiv({ 
        cls: `${CSS_CLASSES.TAG_GROUP} ${this.plugin.settings.defaultGroupState}`
      });
      
      const headerEl = tagGroupEl.createEl('div', { 
        text: `Notes with tag: ${tag}`, 
        cls: CSS_CLASSES.TAG_GROUP_HEADER 
      });
      
      const listEl = tagGroupEl.createEl('ul', { cls: CSS_CLASSES.NOTES_LIST });
      listEl.style.display = this.plugin.settings.defaultGroupState === 'collapsed' ? 'none' : '';

      this.setupTagGroupToggle(tagGroupEl, headerEl, listEl);
      
      const sortedFiles = this.tagAnalyzer.sortFiles(files, this.plugin.settings.defaultSortMode);
      this.renderFileList(listEl, sortedFiles);
      
      tagGroupEl.createEl('hr', { cls: CSS_CLASSES.SEPARATOR });
    });
  }

  private setupTagGroupToggle(tagGroupEl: HTMLElement, headerEl: HTMLElement, listEl: HTMLElement): void {
    headerEl.addEventListener('click', () => {
      tagGroupEl.toggleClass('collapsed', !tagGroupEl.hasClass('collapsed'));
      listEl.style.display = tagGroupEl.hasClass('collapsed') ? 'none' : '';
    });
  }

  private renderFileList(listEl: HTMLElement, files: FileWithMatchedTags[]): void {
    files.forEach(fileWithTags => {
      const listItemEl = listEl.createEl('li', { cls: CSS_CLASSES.LIST_ITEM });
      const linkEl = this.createFileLink(listItemEl, fileWithTags.file);
      this.setupFileLinkEvents(linkEl, fileWithTags.file);
      
      // Add matched tags if the setting is enabled
      if (this.plugin.settings.showMatchedTags) {
        this.renderMatchedTags(listItemEl, fileWithTags.matchedTags);
      }
    });
  }

  private createFileLink(container: HTMLElement, file: TFile): HTMLElement {
    const linkEl = container.createEl('a', {
      text: file.basename,
      href: '#',
      title: 'Hold Cmd/Ctrl + hover to preview\nClick to open',
      cls: CSS_CLASSES.NOTE_LINK
    });
    linkEl.dataset.filePath = file.path;
    return linkEl;
  }

  private setupFileLinkEvents(linkEl: HTMLElement, file: TFile): void {
    let hoverTimer: number;
    
    linkEl.addEventListener('mouseenter', (e: MouseEvent) => {
      // Check immediately for modifier key
      if (e.metaKey || e.ctrlKey) {
        this.previewManager.showPreview(file, linkEl);
      } else {
        // Set up a timer to check for modifier key press while hovering
        hoverTimer = setTimeout(() => {
          if (linkEl.matches(':hover') && this.previewManager.getIsModifierHeld()) {
            this.previewManager.showPreview(file, linkEl);
          }
        }, 100);
      }
    });
    
    linkEl.addEventListener('mouseleave', () => {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
      }
      if (!this.previewManager.getIsModifierHeld()) {
        this.previewManager.hidePreview();
      }
    });

    linkEl.addEventListener('click', (evt: MouseEvent) => {
      evt.preventDefault();
      if (evt.ctrlKey || evt.metaKey) {
        this.app.workspace.getLeaf('tab').openFile(file, { active: true });
      } else {
        this.app.workspace.getLeaf().openFile(file, { active: true });
      }
    });
  }

  private renderMatchedTags(container: HTMLElement, matchedTags: string[]): void {
    const tagsContainer = container.createDiv(CSS_CLASSES.MATCHED_TAGS);
    
    matchedTags.forEach(tag => {
      tagsContainer.createSpan({
        text: tag,
        cls: CSS_CLASSES.MATCHED_TAG
      });
    });
  }
}