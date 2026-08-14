import { ItemView, WorkspaceLeaf, TFile, debounce } from 'obsidian';
import RelatedNotesPlugin from './main';
import { TagAnalyzer, FileWithMatchedTags } from './tag-analyzer';
import { PreviewManager } from './preview-manager';
import { UIRenderer } from './ui-renderer';
import { ExcerptService } from './excerpt-service';
import { MtimeCache } from './mtime-cache';
import { CSS_CLASSES, TIMEOUTS, RENDER_BATCH_SIZE } from './constants';

export const RELATED_NOTES_BY_TAG_VIEW_TYPE = 'related-notes-by-tag-view';

/** Renders part of the list, returning how many notes it placed. */
type RenderChunk = () => number;

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
  private renderedTagSignature: string | null = null;
  private currentRelatedNotesMap: Map<string, FileWithMatchedTags[]> | null = null;
  private currentExcerpts: Map<string, string> = new Map();
  private contentCache = new MtimeCache<string>();
  private listContainerEl: HTMLElement | null = null;
  private searchGeneration = 0;
  private pendingChunks: RenderChunk[] = [];
  private deferredGroupItems: Map<string, RenderChunk[]> = new Map();
  /** Set by expand or collapse all, until a group is toggled on its own. */
  private bulkGroupState: boolean | null = null;
  private renderObserver: IntersectionObserver | null = null;
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

  async handleListViewModeChange(mode: 'tag' | 'title') {
    this.plugin.settings.listViewMode = mode;
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
    this.resetProgressiveRender();
    this.contentCache.clear();
    this.previewManager.cleanup();
    this.uiRenderer.cleanup();
    this.container.empty();
  }

  clearExcerptCache(): void {
    this.excerptService.clearCache();
  }

  /**
   * Forgets which groups the user has opened or closed, so that a change to
   * the default group state is not overridden by choices made before it.
   */
  resetGroupStates(): void {
    this.tagGroupStates.clear();
    this.bulkGroupState = null;
  }

  /**
   * Whether the file's tags differ from those the panel was last built from.
   * Editing a note's prose leaves this false, which is nearly everything
   * typing produces, so the panel can ignore those edits entirely.
   */
  hasTagsChanged(file: TFile): boolean {
    return this.tagAnalyzer.getTagSignature(file) !== this.renderedTagSignature;
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

  /**
   * Rebuilds the list with every group set the same way, rather than toggling
   * the groups already on screen. Collapsing a group whose notes were already
   * queued would otherwise build them into something hidden, where they add no
   * height and so pull in the entire list at once. Rebuilding also settles
   * groups not yet built, which have no state of their own to toggle.
   */
  private handleExpandCollapseToggle(isExpandMode: boolean): void {
    this.bulkGroupState = !isExpandMode;
    this.tagGroupStates.clear();

    // Update button state to opposite mode after performing the action
    this.isExpandAllMode = !isExpandMode;
    if (this.expandCollapseButton) {
      this.uiRenderer.updateExpandCollapseIcon(this.expandCollapseButton, this.isExpandAllMode);
    }

    void this.renderFilteredList(false);
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
      // The search it serves is cleared too, so holding the previous note's
      // contents would only keep the whole vault in memory for nothing
      this.contentCache.clear();
    }

    this.renderedTagSignature = this.tagAnalyzer.getTagSignature(activeFile);

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
        placeholder: 'Search for words or #tags. Use - to exclude',
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

  /**
   * @param preserveGroupState keep the collapse state of the groups on screen.
   * Set false when the caller has just decided that state for every group.
   */
  private async renderFilteredList(preserveGroupState = true): Promise<void> {
    if (!this.listContainerEl || !this.currentRelatedNotesMap) return;

    const generation = ++this.searchGeneration;

    if (preserveGroupState) {
      this.captureCurrentState();
    }

    const filteredMap = await this.filterRelatedNotesMap(this.currentRelatedNotesMap, this.searchQuery);
    if (generation !== this.searchGeneration) return;

    this.resetProgressiveRender();
    this.listContainerEl.empty();

    if (filteredMap.size === 0) {
      this.listContainerEl.createEl('p', { text: 'No notes match your search.' });
      return;
    }

    this.pendingChunks = this.plugin.settings.listViewMode === 'title'
      ? this.buildTitleListChunks(filteredMap, this.currentExcerpts, this.listContainerEl)
      : this.buildTagGroupChunks(filteredMap, this.currentExcerpts, this.listContainerEl);

    this.renderNextChunks();
  }

  /**
   * Renders batches until the budget is spent, then watches for the end of the
   * list coming into view. Nothing is omitted - the rest is built on scroll,
   * so the initial cost no longer scales with the size of the result set.
   */
  private renderNextChunks(): void {
    if (!this.listContainerEl) return;

    this.teardownRenderObserver();
    this.listContainerEl.querySelector(`.${CSS_CLASSES.RENDER_SENTINEL}`)?.remove();

    let rendered = 0;
    while (this.pendingChunks.length > 0 && rendered < RENDER_BATCH_SIZE) {
      rendered += this.pendingChunks.shift()?.() ?? 0;
    }

    this.observeRenderSentinel();
  }

  private observeRenderSentinel(): void {
    if (!this.listContainerEl || this.pendingChunks.length === 0) return;

    const sentinel = this.listContainerEl.createDiv(CSS_CLASSES.RENDER_SENTINEL);

    this.renderObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        this.renderNextChunks();
      }
      // Start filling the next batch slightly before the list runs out
    }, { rootMargin: '200px' });

    this.renderObserver.observe(sentinel);
  }

  private teardownRenderObserver(): void {
    this.renderObserver?.disconnect();
    this.renderObserver = null;
  }

  private resetProgressiveRender(): void {
    this.teardownRenderObserver();
    this.pendingChunks = [];
    this.deferredGroupItems.clear();
  }

  /**
   * Flat list of every matching note, ungrouped. A note matching several tags
   * appears once, with the count of tags it matched.
   */
  private buildTitleListChunks(relatedNotesMap: Map<string, FileWithMatchedTags[]>, excerpts: Map<string, string>, targetContainer: HTMLElement): RenderChunk[] {
    const uniqueNotes = new Map<string, FileWithMatchedTags>();
    relatedNotesMap.forEach(files => {
      files.forEach(fileWithTags => uniqueNotes.set(fileWithTags.file.path, fileWithTags));
    });

    const sortedFiles = this.tagAnalyzer.sortFiles([...uniqueNotes.values()], this.plugin.settings.defaultSortMode);

    const listEl = targetContainer.createEl('ul', { cls: CSS_CLASSES.NOTES_LIST });
    return this.buildFileListChunks(listEl, sortedFiles, excerpts, true);
  }

  private buildFileListChunks(listEl: HTMLElement, files: FileWithMatchedTags[], excerpts: Map<string, string>, showTagMatchCount: boolean): RenderChunk[] {
    const chunks: RenderChunk[] = [];

    for (let start = 0; start < files.length; start += RENDER_BATCH_SIZE) {
      const batch = files.slice(start, start + RENDER_BATCH_SIZE);
      chunks.push(() => {
        this.renderFileList(listEl, batch, excerpts, showTagMatchCount);
        return batch.length;
      });
    }

    return chunks;
  }

  private collectUniqueFiles(relatedNotesMap: Map<string, FileWithMatchedTags[]>): TFile[] {
    const uniqueFiles = new Map<string, TFile>();
    relatedNotesMap.forEach(files => {
      files.forEach(({ file }) => uniqueFiles.set(file.path, file));
    });
    return [...uniqueFiles.values()];
  }

  /**
   * Lowercased note bodies for content matching. Cached because the search
   * re-filters the whole result set on every keystroke, and lowercasing an
   * entire vault repeatedly is what made searching in show all notes slow.
   */
  private async readFileContents(files: TFile[]): Promise<Map<string, string>> {
    return this.contentCache.getMany(files, async file =>
      (await this.app.vault.cachedRead(file)).toLowerCase()
    );
  }

  /**
   * Splits a query into terms to match and terms to exclude, the latter marked
   * by a leading '-'. Terms carrying nothing to match on ('-', '#', '-#') are
   * dropped so a half-typed term does not filter everything out.
   */
  private parseSearchTokens(query: string): { includeTokens: string[]; excludeTokens: string[] } {
    const includeTokens: string[] = [];
    const excludeTokens: string[] = [];

    for (const rawToken of query.toLowerCase().split(/\s+/)) {
      const isExclusion = rawToken.startsWith('-');
      const token = isExclusion ? rawToken.slice(1) : rawToken;

      if (!token || token === '#') continue;

      (isExclusion ? excludeTokens : includeTokens).push(token);
    }

    return { includeTokens, excludeTokens };
  }

  private async filterRelatedNotesMap(relatedNotesMap: Map<string, FileWithMatchedTags[]>, query: string): Promise<Map<string, FileWithMatchedTags[]>> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return relatedNotesMap;

    const { includeTokens, excludeTokens } = this.parseSearchTokens(trimmedQuery);
    if (includeTokens.length === 0 && excludeTokens.length === 0) return relatedNotesMap;

    const needsContent = [...includeTokens, ...excludeTokens].some(token => !token.startsWith('#'));
    const contentByPath = needsContent
      ? await this.readFileContents(this.collectUniqueFiles(relatedNotesMap))
      : new Map<string, string>();

    const matchesQuery = (fileWithTags: FileWithMatchedTags): boolean => {
      const title = fileWithTags.file.basename.toLowerCase();
      const content = contentByPath.get(fileWithTags.file.path) ?? '';
      const tags = fileWithTags.matchedTags.map(tag => tag.toLowerCase());

      const tokenMatches = (token: string): boolean =>
        token.startsWith('#') ? tags.some(tag => tag.includes(token)) : (title.includes(token) || content.includes(token));

      // Exclusions always win, whichever way the match mode combines the rest
      if (excludeTokens.some(tokenMatches)) return false;

      // Excluding without including narrows the existing list rather than emptying it
      if (includeTokens.length === 0) return true;

      return this.searchMatchMode === 'all' ? includeTokens.every(tokenMatches) : includeTokens.some(tokenMatches);
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

    // Deduplicate first: a note appears once per tag it matched, and in show
    // all notes mode that multiplies the whole vault several times over
    return this.excerptService.getExcerptsForFiles(
      this.collectUniqueFiles(relatedNotesMap),
      this.plugin.settings
    );
  }

  private renderHeader(): HTMLElement {
    const headerEl = this.uiRenderer.createHeader(this.container);
    return headerEl;
  }

  private renderControls(headerEl: HTMLElement): void {
    const actionButtons = this.uiRenderer.createActionButtonsContainer(headerEl);
    const isTitleView = this.plugin.settings.listViewMode === 'title';

    // Dropdowns first, then the toggle buttons, separated by a spacer
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

    this.uiRenderer.createTagSortDropdown(
      actionButtons,
      this.plugin.settings.defaultTagSortMode,
      (mode) => void this.handleTagSortChange(mode),
      isTitleView
    );

    this.uiRenderer.createToolbarSpacer(actionButtons);

    this.uiRenderer.createListViewToggleButton(
      actionButtons,
      this.plugin.settings.listViewMode,
      (mode) => void this.handleListViewModeChange(mode)
    );

    this.uiRenderer.createTagsToggleButton(
      actionButtons,
      this.plugin.settings.showMatchedTags,
      this.plugin.settings.defaultFilterMode === 'all',
      (showTags) => void this.handleTagsToggle(showTags)
    );

    // Initialize button state - opposite of defaultGroupState
    this.isExpandAllMode = this.plugin.settings.defaultGroupState === 'collapsed';

    this.expandCollapseButton = this.uiRenderer.createExpandCollapseButton(
      actionButtons,
      this.isExpandAllMode,
      (newMode) => this.handleExpandCollapseToggle(newMode),
      isTitleView
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

  /**
   * Each note's home group: the alphabetically first of its matched tags.
   * Deliberately independent of the displayed group order, so changing the
   * tag sort reorders the groups without moving notes between them. Rarity
   * would be a more useful home than alphabetical order, but it shifts with
   * the current result set, so searching would silently re-home notes.
   */
  private homeTagFor(fileWithTags: FileWithMatchedTags): string | undefined {
    return [...fileWithTags.matchedTags].sort((a, b) => a.localeCompare(b))[0];
  }

  /**
   * Lists each note once only, under its home tag group. Groups left with
   * nothing are dropped rather than rendered empty.
   */
  private claimNotesByHomeTag(entries: [string, FileWithMatchedTags[]][]): [string, FileWithMatchedTags[]][] {
    return entries
      .map(([tag, files]): [string, FileWithMatchedTags[]] => [
        tag,
        files.filter(fileWithTags => this.homeTagFor(fileWithTags) === tag)
      ])
      .filter(([, files]) => files.length > 0);
  }

  private buildTagGroupChunks(relatedNotesMap: Map<string, FileWithMatchedTags[]>, excerpts: Map<string, string>, targetContainer: HTMLElement): RenderChunk[] {
    // Convert Map to array and sort tag groups per the tag sort setting
    const sortedTagEntries = Array.from(relatedNotesMap.entries())
      .sort(([tagA, filesA], [tagB, filesB]) => {
        if (this.plugin.settings.defaultTagSortMode === 'name') {
          return tagA.localeCompare(tagB);
        }
        return filesB.length - filesA.length;
      });

    const displayedTagEntries = this.plugin.settings.showNotesInAllTagGroups
      ? sortedTagEntries
      : this.claimNotesByHomeTag(sortedTagEntries);

    // One chunk per group header. Each queues its own notes as it is built, so
    // a run of groups costs no more than a run of notes
    return displayedTagEntries.map(([tag, files]) => () => {
      const { listEl, isCollapsed } = this.createTagGroup(tag, files, targetContainer);

      const sortedFiles = this.tagAnalyzer.sortFiles(files, this.plugin.settings.defaultSortMode);
      const itemChunks = this.buildFileListChunks(
        listEl,
        sortedFiles,
        excerpts,
        !this.plugin.settings.showNotesInAllTagGroups
      );

      if (isCollapsed) {
        // Hidden notes occupy no space, so rendering them would leave the end
        // of the list still on screen and pull in the whole vault at once
        this.deferredGroupItems.set(tag, itemChunks);
      } else {
        this.pendingChunks.unshift(...itemChunks);
      }

      return 1;
    });
  }

  private createTagGroup(tag: string, files: FileWithMatchedTags[], targetContainer: HTMLElement): { listEl: HTMLElement; isCollapsed: boolean } {
    // A group's own state wins, then any expand or collapse all still in
    // force, then the setting - so groups built later match those already shown
    const isCollapsed = this.tagGroupStates.get(tag)
      ?? this.bulkGroupState
      ?? this.plugin.settings.defaultGroupState === 'collapsed';

    const tagGroupEl = targetContainer.createDiv({
      cls: `${CSS_CLASSES.TAG_GROUP} ${isCollapsed ? 'collapsed' : 'expanded'}`
    });

    const headerEl = tagGroupEl.createDiv({
      text: `Notes with tag: ${tag} ` + ' (' + files.length + ')',
      cls: CSS_CLASSES.TAG_GROUP_HEADER,
      attr: {
        tabindex: '0',
        role: 'button',
        'aria-expanded': isCollapsed ? 'false' : 'true'
      }
    });

    const listEl = tagGroupEl.createEl('ul', { cls: CSS_CLASSES.NOTES_LIST });

    this.setupTagGroupToggle(tagGroupEl, headerEl, tag);

    tagGroupEl.createEl('hr', { cls: CSS_CLASSES.SEPARATOR });

    return { listEl, isCollapsed };
  }

  /**
   * Builds the notes of a group whose rendering was held back while collapsed.
   */
  private renderDeferredGroup(tag: string): void {
    const deferred = this.deferredGroupItems.get(tag);
    if (!deferred) return;

    this.deferredGroupItems.delete(tag);
    this.pendingChunks.unshift(...deferred);
    this.renderNextChunks();
  }

  private setupTagGroupToggle(tagGroupEl: HTMLElement, headerEl: HTMLElement, tag: string): void {
    const toggleGroup = () => {
      const willBeCollapsed = !tagGroupEl.hasClass('collapsed');
      tagGroupEl.toggleClass('collapsed', willBeCollapsed);
      headerEl.setAttribute('aria-expanded', (!willBeCollapsed).toString());
      this.tagGroupStates.set(tag, willBeCollapsed);

      if (!willBeCollapsed) {
        this.renderDeferredGroup(tag);
      }
    };

    headerEl.addEventListener('click', toggleGroup);

    headerEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleGroup();
      }
    });
  }

  private renderFileList(listEl: HTMLElement, files: FileWithMatchedTags[], excerpts: Map<string, string>, showTagMatchCount: boolean): void {
    files.forEach(fileWithTags => {
      const listItemEl = listEl.createEl('li', { cls: CSS_CLASSES.LIST_ITEM });
      const excerpt = excerpts.get(fileWithTags.file.path) ?? '';
      const matchedTagCount = showTagMatchCount ? fileWithTags.matchedTags.length : 0;
      const { linkEl, excerptEl } = this.createFileLink(listItemEl, fileWithTags.file, excerpt, matchedTagCount);
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

  private createFileLink(container: HTMLElement, file: TFile, excerpt: string, matchedTagCount: number): { linkEl: HTMLElement; excerptEl?: HTMLElement } {
    const mode = this.plugin.settings.noteDisplayMode;
    const titleText = mode === 'excerpt' && excerpt ? excerpt : file.basename;

    const linkEl = container.createEl('a', {
      text: titleText,
      href: '#',
      title: 'Hold Cmd/Ctrl + hover to preview\nClick to open',
      cls: CSS_CLASSES.NOTE_LINK
    });
    linkEl.dataset.filePath = file.path;

    // Sibling of the link, not a child, so the title's colour/size/weight
    // overrides do not apply to it
    if (matchedTagCount > 1) {
      container.createSpan({
        text: ` (${matchedTagCount})`,
        cls: CSS_CLASSES.TAG_MATCH_COUNT
      });
    }

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