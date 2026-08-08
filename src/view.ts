import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import RelatedNotesPlugin from './main';
import { TagAnalyzer, FileWithMatchedTags } from './tag-analyzer';
import { PreviewManager } from './preview-manager';
import { UIRenderer } from './ui-renderer';
import { ExcerptService } from './excerpt-service';
import { CSS_CLASSES } from './constants';

export const RELATED_NOTES_BY_TAG_VIEW_TYPE = 'related-notes-by-tag-view';

export class RelatedNotesView extends ItemView {
  plugin: RelatedNotesPlugin;
  private container: HTMLElement;
  private tagAnalyzer: TagAnalyzer;
  private previewManager: PreviewManager;
  private uiRenderer: UIRenderer;
  private excerptService: ExcerptService;
  private tagGroupStates: Map<string, boolean> = new Map();
  private isExpandAllMode: boolean = false;
  private expandCollapseButton: HTMLElement | null = null;
  private renderGeneration = 0;
  
  async handleSortChange(mode: 'name'|'date'|'created') {
    this.plugin.settings.defaultSortMode = mode;
    await this.plugin.saveSettings();
    await this.updateView();
  }

  async handleFilterChange(filterMode: 1|2|3) {
    this.plugin.settings.defaultFilterMode = filterMode;
    await this.plugin.saveSettings();
    await this.updateView();
  }

  async handleTagsToggle(showTags: boolean) {
    this.plugin.settings.showMatchedTags = showTags;
    await this.plugin.saveSettings();
    await this.updateView();
  }

  constructor(leaf: WorkspaceLeaf, plugin: RelatedNotesPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.tagAnalyzer = new TagAnalyzer(this.app);
    this.previewManager = new PreviewManager(this.app);
    this.uiRenderer = new UIRenderer();
    this.excerptService = new ExcerptService(this.app);
  }

  getViewType(): string {
    return RELATED_NOTES_BY_TAG_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Related notes by tag';
  }

  getIcon(): string {
    return 'tag';
  }

  async onOpen() {
    this.container = this.contentEl;
    this.container.empty();
    this.container.addClass(CSS_CLASSES.CONTAINER);
    await this.updateView();
  }

  async onClose() {
    this.previewManager.cleanup();
    this.uiRenderer.cleanup();
    this.container.empty();
  }

  clearExcerptCache(): void {
    this.excerptService.clearCache();
  }

  private captureCurrentState(): void {
    const tagGroups = this.container.querySelectorAll(`.${CSS_CLASSES.TAG_GROUP}`);
    
    tagGroups.forEach((group: HTMLElement) => {
      const headerEl = group.querySelector(`.${CSS_CLASSES.TAG_GROUP_HEADER}`);
      if (headerEl?.textContent) {
        const tagName = headerEl.textContent.replace('Notes with tag: ', '');
        const isCollapsed = group.hasClass('collapsed');
        this.tagGroupStates.set(tagName, isCollapsed);
      }
    });
  }

  private restoreState(): void {
    const tagGroups = this.container.querySelectorAll(`.${CSS_CLASSES.TAG_GROUP}`);
    
    tagGroups.forEach((group: HTMLElement) => {
      const headerEl = group.querySelector(`.${CSS_CLASSES.TAG_GROUP_HEADER}`);
      if (headerEl?.textContent) {
        const tagName = headerEl.textContent.replace('Notes with tag: ', '');
        const savedState = this.tagGroupStates.get(tagName);
        
        if (savedState !== undefined) {
          group.toggleClass('collapsed', savedState);
        }
      }
    });
  }

  private handleExpandCollapseToggle(isExpandMode: boolean): void {
    // Apply the current action to all tag groups
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
    
    // Update button state to opposite mode after performing the action
    this.isExpandAllMode = !isExpandMode;
    if (this.expandCollapseButton) {
      this.uiRenderer.updateExpandCollapseIcon(this.expandCollapseButton, this.isExpandAllMode);
    }
  }

  async updateView() {
    if (!this.plugin.app.workspace.layoutReady) {
      return;
    }

    const generation = ++this.renderGeneration;

    this.captureCurrentState();

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

    const excerpts = await this.getExcerptsIfNeeded(analysisResult.relatedNotesMap);
    if (generation !== this.renderGeneration) return;

    this.renderTagGroups(analysisResult.relatedNotesMap, excerpts);

    this.restoreState();
  }

  private async getExcerptsIfNeeded(relatedNotesMap: Map<string, FileWithMatchedTags[]>): Promise<Map<string, string>> {
    if (this.plugin.settings.noteDisplayMode === 'title') {
      return new Map<string, string>();
    }

    const allFiles: TFile[] = [];
    relatedNotesMap.forEach(files => {
      files.forEach(f => allFiles.push(f.file));
    });

    return this.excerptService.getExcerptsForFiles(allFiles, this.plugin.settings);
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
      (mode) => void this.handleSortChange(mode)
    );
    
    this.uiRenderer.createFilterDropdown(
      actionButtons,
      this.plugin.settings.defaultFilterMode,
      (mode) => void this.handleFilterChange(mode)
    );
    
    this.uiRenderer.createTagsToggleButton(
      actionButtons,
      this.plugin.settings.showMatchedTags,
      (showTags) => void this.handleTagsToggle(showTags)
    );
    
    // Initialize button state - opposite of defaultGroupState
    this.isExpandAllMode = this.plugin.settings.defaultGroupState === 'collapsed';
    
    this.expandCollapseButton = this.uiRenderer.createExpandCollapseButton(
      actionButtons,
      this.isExpandAllMode,
      (newMode) => this.handleExpandCollapseToggle(newMode)
    );
  }

  private getActiveFile(): TFile | null {
    const activeFile = this.app.workspace.getActiveFile();
    
    if (!activeFile || !(activeFile instanceof TFile)) {
      this.container.createEl('p', { text: 'No active note selected.' });
      return null;
    }
    
    return activeFile;
  }

  private renderTagGroups(relatedNotesMap: Map<string, FileWithMatchedTags[]>, excerpts: Map<string, string>): void {
    // Convert Map to array and sort by file count (highest to lowest)
    const sortedTagEntries = Array.from(relatedNotesMap.entries())
      .sort(([, filesA], [, filesB]) => filesB.length - filesA.length);

    sortedTagEntries.forEach(([tag, files]) => {
      const savedState = this.tagGroupStates.get(tag);
      const shouldBeCollapsed = savedState !== undefined 
        ? savedState 
        : this.plugin.settings.defaultGroupState === 'collapsed';
      
      const tagGroupEl = this.container.createDiv({ 
        cls: `${CSS_CLASSES.TAG_GROUP} ${shouldBeCollapsed ? 'collapsed' : 'expanded'}`
      });

      const sortedFiles = this.tagAnalyzer.sortFiles(files, this.plugin.settings.defaultSortMode);

      const headerEl = tagGroupEl.createDiv({
        text: `Notes with tag: ${tag} ` + ' (' + sortedFiles.length + ')',
        cls: CSS_CLASSES.TAG_GROUP_HEADER,
        attr: {
          tabindex: '0',
          role: 'button',
          'aria-expanded': shouldBeCollapsed ? 'false' : 'true'
        }
      });
      
      const listEl = tagGroupEl.createEl('ul', { cls: CSS_CLASSES.NOTES_LIST });

      this.setupTagGroupToggle(tagGroupEl, headerEl, tag);

      this.renderFileList(listEl, sortedFiles, excerpts);
      
      tagGroupEl.createEl('hr', { cls: CSS_CLASSES.SEPARATOR });
    });
  }

  private setupTagGroupToggle(tagGroupEl: HTMLElement, headerEl: HTMLElement, tag: string): void {
    const toggleGroup = () => {
      const willBeCollapsed = !tagGroupEl.hasClass('collapsed');
      tagGroupEl.toggleClass('collapsed', willBeCollapsed);
      headerEl.setAttribute('aria-expanded', (!willBeCollapsed).toString());
      this.tagGroupStates.set(tag, willBeCollapsed);
    };

    headerEl.addEventListener('click', toggleGroup);

    headerEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleGroup();
      }
    });
  }

  private renderFileList(listEl: HTMLElement, files: FileWithMatchedTags[], excerpts: Map<string, string>): void {
    files.forEach(fileWithTags => {
      const listItemEl = listEl.createEl('li', { cls: CSS_CLASSES.LIST_ITEM });
      const excerpt = excerpts.get(fileWithTags.file.path) ?? '';
      const { linkEl, excerptEl } = this.createFileLink(listItemEl, fileWithTags.file, excerpt);
      this.setupFileLinkEvents(linkEl, fileWithTags.file);
      if (excerptEl) {
        this.setupFileLinkEvents(excerptEl, fileWithTags.file);
      }

      // Add matched tags if the setting is enabled
      if (this.plugin.settings.showMatchedTags) {
        this.renderMatchedTags(listItemEl, fileWithTags.matchedTags);
      }
    });
  }

  private createFileLink(container: HTMLElement, file: TFile, excerpt: string): { linkEl: HTMLElement; excerptEl?: HTMLElement } {
    const mode = this.plugin.settings.noteDisplayMode;
    const titleText = mode === 'excerpt' && excerpt ? excerpt : file.basename;

    const linkEl = container.createEl('a', {
      text: titleText,
      href: '#',
      title: 'Hold Cmd/Ctrl + hover to preview\nClick to open',
      cls: CSS_CLASSES.NOTE_LINK
    });
    linkEl.dataset.filePath = file.path;

    let excerptEl: HTMLElement | undefined;
    if (mode === 'title-excerpt' && excerpt) {
      excerptEl = container.createDiv({ text: excerpt, cls: CSS_CLASSES.EXCERPT });
    }

    return { linkEl, excerptEl };
  }

  private setupFileLinkEvents(linkEl: HTMLElement, file: TFile): void {
    let hoverTimer: number;
    
    linkEl.addEventListener('mouseenter', (e: MouseEvent) => {
      // Check immediately for modifier key
      if (e.metaKey || e.ctrlKey) {
        this.previewManager.showPreview(file, linkEl);
      } else {
        // Set up a timer to check for modifier key press while hovering
        hoverTimer = activeWindow.setTimeout(() => {
          if (linkEl.matches(':hover') && this.previewManager.getIsModifierHeld()) {
            this.previewManager.showPreview(file, linkEl);
          }
        }, 100);
      }
    });
    
    linkEl.addEventListener('mouseleave', () => {
      if (hoverTimer) {
        activeWindow.clearTimeout(hoverTimer);
      }
      if (!this.previewManager.getIsModifierHeld()) {
        this.previewManager.hidePreview();
      }
    });

    linkEl.addEventListener('click', (evt: MouseEvent) => {
      evt.preventDefault();
      if (evt.ctrlKey || evt.metaKey) {
        void this.app.workspace.getLeaf('tab').openFile(file, { active: true });
      } else {
        void this.app.workspace.getLeaf().openFile(file, { active: true });
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