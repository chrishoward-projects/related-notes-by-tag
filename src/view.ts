import { ItemView, WorkspaceLeaf, TFile, debounce } from 'obsidian';
import RelatedNotesPlugin from './main';
import { TagAnalyzer, FileWithMatchedTags } from './tag-analyzer';
import { PreviewManager } from './preview-manager';
import { UIRenderer } from './ui-renderer';
import { ExcerptService } from './excerpt-service';
import { CSS_CLASSES, TIMEOUTS } from './constants';

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
  private searchQuery: string = '';
  private searchMatchMode: 'any' | 'all' = 'any';
  private lastActiveFilePath: string | null = null;
  private currentRelatedNotesMap: Map<string, FileWithMatchedTags[]> | null = null;
  private currentExcerpts: Map<string, string> = new Map();
  private listContainerEl: HTMLElement | null = null;
  private searchGeneration = 0;
  private debouncedFilteredListUpdate = debounce(
    () => void this.renderFilteredList(),
    TIMEOUTS.SEARCH_DEBOUNCE_DELAY,
    true
  );
  
  async handleSortChange(mode: 'name'|'date'|'created') {
    this.plugin.settings.defaultSortMode = mode;
    await this.plugin.saveSettings();
    await this.updateView();
  }

  async handleTagSortChange(mode: 'name'|'count') {
    this.plugin.settings.defaultTagSortMode = mode;
    await this.plugin.saveSettings();
    await this.updateView();
  }

  async handleFilterChange(filterMode: 1|2|3|'all') {
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
    this.clearSearchDebounce();
    this.previewManager.cleanup();
    this.uiRenderer.cleanup();
    this.container.empty();
  }

  clearExcerptCache(): void {
    this.excerptService.clearCache();
  }

  private applyTitleStyleOverrides(): void {
    const settings = this.plugin.settings;
    this.setOrClearCssVar('--related-notes-title-color', settings.titleColor);
    this.setOrClearCssVar('--related-notes-title-font-size', settings.titleFontSize > 0 ? `${settings.titleFontSize}px` : '');
    this.setOrClearCssVar('--related-notes-title-font-weight', settings.titleFontWeight);
  }

  private setOrClearCssVar(name: string, value: string): void {
    if (value) {
      this.container.style.setProperty(name, value);
    } else {
      this.container.style.removeProperty(name);
    }
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

    this.applyTitleStyleOverrides();

    const headerEl = this.renderHeader();
    this.renderControls(headerEl);

    const activeFile = this.getActiveFile();
    if (!activeFile) return;

    if (activeFile.path !== this.lastActiveFilePath) {
      this.searchQuery = '';
      this.searchMatchMode = 'any';
      this.lastActiveFilePath = activeFile.path;
    }

    const analysisResult = this.tagAnalyzer.analyzeRelatedNotes(activeFile, this.plugin.settings);

    const isShowAllMode = this.plugin.settings.defaultFilterMode === 'all';

    if (!isShowAllMode && analysisResult.currentNoteTags.length === 0) {
      this.container.createEl('p', { text: 'Active note has no tags.' });
      return;
    }

    if (analysisResult.relatedNotesMap.size === 0) {
      const message = isShowAllMode ? 'No other tagged notes found.' : 'No other notes found with matching tags.';
      this.container.createEl('p', { text: message });
      return;
    }

    const excerpts = await this.getExcerptsIfNeeded(analysisResult.relatedNotesMap);
    if (generation !== this.renderGeneration) return;

    this.currentRelatedNotesMap = analysisResult.relatedNotesMap;
    this.currentExcerpts = excerpts;

    this.renderSearchField(this.container);
    this.listContainerEl = this.container.createDiv();
    await this.renderFilteredList();
  }

  private renderSearchField(container: HTMLElement): void {
    const searchContainer = container.createDiv(CSS_CLASSES.SEARCH_CONTAINER);
    const input = searchContainer.createEl('input', {
      type: 'search',
      cls: CSS_CLASSES.SEARCH_INPUT,
      attr: {
        placeholder: 'Search notes or #tags…',
        'aria-label': 'Search related notes'
      }
    });
    input.value = this.searchQuery;

    input.addEventListener('input', () => {
      this.searchQuery = input.value;
      this.debouncedFilteredListUpdate();
    });

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && input.value) {
        e.preventDefault();
        input.value = '';
        this.searchQuery = '';
        this.clearSearchDebounce();
        void this.renderFilteredList();
      }
    });

    this.uiRenderer.createSearchMatchDropdown(
      searchContainer,
      this.searchMatchMode,
      (mode) => {
        this.searchMatchMode = mode;
        this.clearSearchDebounce();
        void this.renderFilteredList();
      }
    );
  }

  private clearSearchDebounce(): void {
    this.debouncedFilteredListUpdate.cancel();
  }

  private async renderFilteredList(): Promise<void> {
    if (!this.listContainerEl || !this.currentRelatedNotesMap) return;

    const generation = ++this.searchGeneration;

    this.captureCurrentState();

    const filteredMap = await this.filterRelatedNotesMap(this.currentRelatedNotesMap, this.searchQuery);
    if (generation !== this.searchGeneration) return;

    this.listContainerEl.empty();

    if (filteredMap.size === 0) {
      this.listContainerEl.createEl('p', { text: 'No notes match your search.' });
      return;
    }

    this.renderTagGroups(filteredMap, this.currentExcerpts, this.listContainerEl);
    this.restoreState();
  }

  private collectUniqueFiles(relatedNotesMap: Map<string, FileWithMatchedTags[]>): TFile[] {
    const uniqueFiles = new Map<string, TFile>();
    relatedNotesMap.forEach(files => {
      files.forEach(({ file }) => uniqueFiles.set(file.path, file));
    });
    return [...uniqueFiles.values()];
  }

  private async readFileContents(files: TFile[]): Promise<Map<string, string>> {
    const entries = await Promise.all(files.map(async (file): Promise<[string, string]> => {
      const content = await this.app.vault.cachedRead(file);
      return [file.path, content.toLowerCase()];
    }));
    return new Map(entries);
  }

  private async filterRelatedNotesMap(relatedNotesMap: Map<string, FileWithMatchedTags[]>, query: string): Promise<Map<string, FileWithMatchedTags[]>> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return relatedNotesMap;

    const tokens = trimmedQuery.toLowerCase().split(/\s+/).filter(token => token !== '#');
    const wordTokens = tokens.filter(token => !token.startsWith('#'));

    const contentByPath = wordTokens.length > 0
      ? await this.readFileContents(this.collectUniqueFiles(relatedNotesMap))
      : new Map<string, string>();

    const matchesQuery = (fileWithTags: FileWithMatchedTags): boolean => {
      const title = fileWithTags.file.basename.toLowerCase();
      const content = contentByPath.get(fileWithTags.file.path) ?? '';
      const tags = fileWithTags.matchedTags.map(tag => tag.toLowerCase());

      const tokenMatches = (token: string): boolean =>
        token.startsWith('#') ? tags.some(tag => tag.includes(token)) : (title.includes(token) || content.includes(token));

      return this.searchMatchMode === 'all' ? tokens.every(tokenMatches) : tokens.some(tokenMatches);
    };

    const filteredMap = new Map<string, FileWithMatchedTags[]>();
    relatedNotesMap.forEach((files, tag) => {
      const filteredFiles = files.filter(matchesQuery);
      if (filteredFiles.length > 0) {
        filteredMap.set(tag, filteredFiles);
      }
    });

    return filteredMap;
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
      this.plugin.settings.defaultFilterMode === 'all',
      (showTags) => void this.handleTagsToggle(showTags)
    );

    this.uiRenderer.createTagSortDropdown(
      actionButtons,
      this.plugin.settings.defaultTagSortMode,
      (mode) => void this.handleTagSortChange(mode)
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

  private renderTagGroups(relatedNotesMap: Map<string, FileWithMatchedTags[]>, excerpts: Map<string, string>, targetContainer: HTMLElement): void {
    // Convert Map to array and sort tag groups per the tag sort setting
    const sortedTagEntries = Array.from(relatedNotesMap.entries())
      .sort(([tagA, filesA], [tagB, filesB]) => {
        if (this.plugin.settings.defaultTagSortMode === 'name') {
          return tagA.localeCompare(tagB);
        }
        return filesB.length - filesA.length;
      });

    sortedTagEntries.forEach(([tag, files]) => {
      const savedState = this.tagGroupStates.get(tag);
      const shouldBeCollapsed = savedState !== undefined 
        ? savedState 
        : this.plugin.settings.defaultGroupState === 'collapsed';
      
      const tagGroupEl = targetContainer.createDiv({
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
        hoverTimer = window.setTimeout(() => {
          if (linkEl.matches(':hover') && this.previewManager.getIsModifierHeld()) {
            this.previewManager.showPreview(file, linkEl);
          }
        }, 100);
      }
    });
    
    linkEl.addEventListener('mouseleave', () => {
      if (hoverTimer) {
        window.clearTimeout(hoverTimer);
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