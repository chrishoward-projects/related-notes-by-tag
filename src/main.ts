import { Plugin, WorkspaceLeaf, Notice, requireApiVersion, debounce } from 'obsidian';
import { RelatedNotesSettings, DEFAULT_SETTINGS, RelatedNotesSettingTab } from './settings';
import { RelatedNotesView, RELATED_NOTES_BY_TAG_VIEW_TYPE } from './view';
import { TIMEOUTS, NEXT_RELEASE_MIN_APP_VERSION } from './constants';

export default class RelatedNotesPlugin extends Plugin {
  settings: RelatedNotesSettings;

  /** Set when an update was skipped because the panel was off screen. */
  private refreshPending = false;

  /**
   * Two settling times for the same rebuild. Obsidian saves periodically while
   * you type, and every save re-parses the note, so a tag typed as #p, #pr,
   * #pro each arrive as a real tag change several seconds apart - too far apart
   * for one short debounce to merge. Waiting longer while a tag is still being
   * typed keeps those out, without making a finished change feel sluggish.
   */
  private debouncedRefresh = debounce(
    () => void this.refreshView(),
    TIMEOUTS.TAG_UPDATE_DELAY,
    true
  );

  private debouncedComposingRefresh = debounce(
    () => void this.refreshView(),
    TIMEOUTS.TAG_COMPOSE_DELAY,
    true
  );

  async onload() {

    await this.loadSettings();

    // Register the view
    this.registerView(
      RELATED_NOTES_BY_TAG_VIEW_TYPE,
      (leaf) => new RelatedNotesView(leaf, this)
    );

    // Add a command to activate the view
    this.addCommand({
      id: 'open-related-notes-panel',
      name: 'Open sidebar',
      callback: () => {
        void this.activateView();
      },
    });

    // Add the settings tab
    this.addSettingTab(new RelatedNotesSettingTab(this.app, this));

    // Event listeners
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (activeLeaf) => {
        const view = this.getView();
        if (!view || !activeLeaf) return;

        // Our own panel becoming active can mean it was just revealed, so any
        // update skipped while it was hidden needs applying now
        if (view.leaf === activeLeaf) {
          this.refreshIfPending();
          return;
        }

        if (activeLeaf.view.getViewType() !== 'markdown') return;

        // Defer update to allow click event and other UI changes to complete
        window.setTimeout(() => void this.refreshView(), TIMEOUTS.VIEW_UPDATE_DELAY);
      })
    );

    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        const view = this.getView();
        if (!view) return;

        // Only edits to the active note can change what the panel shows, and
        // only then if they changed its tags - this lists notes by tag, so
        // editing a note's prose leaves the panel's contents identical
        if (this.app.workspace.getActiveFile()?.path !== file.path) return;
        if (!view.hasTagsChanged(file)) return;

        this.scheduleRefresh();
      })
    );

    // Expanding a collapsed sidebar is not a leaf change, so catch it here
    this.registerEvent(
      this.app.workspace.on('layout-change', () => this.refreshIfPending())
    );

    // Layout ready handler
    this.app.workspace.onLayoutReady(() => {
      void this.initializePanelInSidebar();
      void this.maybeShowUpgradeNotice();
    });

  }

  /**
   * Tells users on an Obsidian older than the next release's minimum, once,
   * that this is the last version they will be offered. `requiredVersion` is a
   * parameter rather than a constant read inline so the real gating logic can
   * be exercised from the developer console without faking the app version.
   */
  async maybeShowUpgradeNotice(requiredVersion: string = NEXT_RELEASE_MIN_APP_VERSION): Promise<void> {
    if (requireApiVersion(requiredVersion)) return;
    if (this.settings.upgradeNoticeShown) return;

    this.showUpgradeNotice(requiredVersion);

    this.settings.upgradeNoticeShown = true;
    await this.saveSettings();
  }

  showUpgradeNotice(requiredVersion: string = NEXT_RELEASE_MIN_APP_VERSION): void {
    const message = createFragment(frag => {
      frag.createDiv({ text: 'Related notes by tag' });
      frag.createEl('br');
      frag.createDiv({
        text: `Version ${this.manifest.version} is the last update available for your version of Obsidian.`
      });
      frag.createEl('br');
      frag.createDiv({
        text: `Later releases need Obsidian ${requiredVersion} or newer. Update Obsidian to keep receiving plugin updates.`
      });
      frag.createEl('br');
      frag.createDiv({ text: 'Click to close this notice' });
    });

    // Duration 0 keeps the notice up until dismissed; it is shown only once.
    new Notice(message, 0);
  }

  onunload() {
    this.debouncedRefresh.cancel();
    this.debouncedComposingRefresh.cancel();
  }

  /**
   * Queues a rebuild, waiting longer if a tag is still being typed. Only one
   * of the two is ever pending, so the wait reflects the most recent edit.
   */
  private scheduleRefresh(): void {
    if (this.isComposingTag()) {
      this.debouncedRefresh.cancel();
      this.debouncedComposingRefresh();
      return;
    }

    this.debouncedComposingRefresh.cancel();
    this.debouncedRefresh();
  }

  /**
   * Whether the cursor is somewhere a tag is still being written.
   */
  private isComposingTag(): boolean {
    const activeEditor = this.app.workspace.activeEditor;
    const editor = activeEditor?.editor;
    if (!activeEditor?.file || !editor) return false;

    const cursor = editor.getCursor();

    // This is only asked once the tags have changed, so the cursor sitting
    // anywhere in frontmatter means it is the tags field being edited
    const frontmatter = this.app.metadataCache.getFileCache(activeEditor.file)?.frontmatterPosition;
    if (frontmatter && cursor.line >= frontmatter.start.line && cursor.line <= frontmatter.end.line) {
      return true;
    }

    // Inline: a tag ends at whitespace, so one running up to the cursor is
    // unfinished, and anything else means the user has moved on from it
    return /#[^\s#]*$/.test(editor.getLine(cursor.line).slice(0, cursor.ch));
  }

  /**
   * Rebuilds the panel, unless it is hidden behind a collapsed sidebar or
   * another sidebar tab. The view instance stays alive there, so without this
   * check it would keep scanning the vault for nobody. A skipped update is
   * remembered and applied as soon as the panel is back on screen.
   */
  private async refreshView(): Promise<void> {
    const view = this.getView();
    if (!view) return;

    if (!view.containerEl.isShown()) {
      this.refreshPending = true;
      return;
    }

    this.refreshPending = false;
    await view.updateView();
  }

  /** Lets a change to the default group state override earlier choices. */
  resetGroupStates(): void {
    this.getView()?.resetGroupStates();
  }

  private refreshIfPending(): void {
    if (this.refreshPending) {
      void this.refreshView();
    }
  }

  private getView(): RelatedNotesView | null {
    const leaves = this.app.workspace.getLeavesOfType(RELATED_NOTES_BY_TAG_VIEW_TYPE);
    if (leaves.length > 0) {
      const view = leaves[0].view;
      // Type guard: ensure the view is actually a RelatedNotesView instance
      if (view instanceof RelatedNotesView && typeof view.updateView === 'function') {
        return view;
      }
    }
    return null;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // Settings can change how notes are displayed, so cached excerpts may be stale
    this.getView()?.clearExcerptCache();
    await this.refreshView();
  }

  async initializePanelInSidebar() {
    // Check if panel already exists
    const existingLeaves = this.app.workspace.getLeavesOfType(RELATED_NOTES_BY_TAG_VIEW_TYPE);
    if (existingLeaves.length > 0) {
      return; // Already exists
    }

    // Add panel to right sidebar without opening it
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({
        type: RELATED_NOTES_BY_TAG_VIEW_TYPE,
        active: false, // Don't make it active (visible)
      });
    }
  }

  async activateView() {
    // Check if view is already open
    const existingLeaves = this.app.workspace.getLeavesOfType(RELATED_NOTES_BY_TAG_VIEW_TYPE);
    if (existingLeaves.length > 0) {
      await this.app.workspace.revealLeaf(existingLeaves[0]);
      return;
    }

    // Open in right sidebar
    let leaf: WorkspaceLeaf | null = this.app.workspace.getRightLeaf(false);
    if (!leaf) {
      // If no right leaf, create one
      leaf = this.app.workspace.getRightLeaf(true);
    }
    if (leaf) {
        await leaf.setViewState({
            type: RELATED_NOTES_BY_TAG_VIEW_TYPE,
            active: true,
        });
        await this.app.workspace.revealLeaf(leaf);
        // The view instance is created by the registerView callback
        // and updateView will be called by its onOpen method.
    } else {
        new Notice('Could not open sidebar: no available leaf.');
    }
  }
}
