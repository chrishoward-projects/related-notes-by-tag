import { Plugin, WorkspaceLeaf, Notice, addIcon } from 'obsidian';
import { RelatedNotesSettings, DEFAULT_SETTINGS, RelatedNotesSettingTab } from './settings';
import { RelatedNotesView, RELATED_NOTES_VIEW_TYPE } from './view';
import { ICONS, TIMEOUTS } from './constants';

export default class RelatedNotesPlugin extends Plugin {
  settings: RelatedNotesSettings;
  private view: RelatedNotesView | null = null;

  async onload() {

    await this.loadSettings();

    // Register the view
    this.registerView(
      RELATED_NOTES_VIEW_TYPE,
      (leaf) => {
        this.view = new RelatedNotesView(leaf, this);
        return this.view;
      }
    );

    // Add a command to activate the view
    this.addCommand({
      id: 'open-related-notes-panel',
      name: 'Open Related Notes by Tag sidebar',
      callback: () => {
        this.activateView();
      },
    });

    // Add the settings tab
    this.addSettingTab(new RelatedNotesSettingTab(this.app, this));

    // Event listeners
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (activeLeaf) => {
        // Check if our view exists, if an activeLeaf is provided,
        // if our view's leaf is not the one that just became active,
        // and if the newly active leaf is a markdown view.
        if (this.view && activeLeaf && this.view.leaf !== activeLeaf && activeLeaf.view.getViewType() === 'markdown') {
          // Defer update to allow click event and other UI changes to complete
          setTimeout(async () => {
            if (this.view) { // Re-check this.view in case it was closed during the timeout
              await this.view.updateView();
            }
          }, TIMEOUTS.VIEW_UPDATE_DELAY);
        }
      })
    );

    this.registerEvent(
      this.app.metadataCache.on('changed', async (file) => {
        // Only update if the changed file is the active file and the view is open
        if (this.view && this.app.workspace.getActiveFile()?.path === file.path) {
          await this.view.updateView();
        }
        // Only update for active file changes to reduce excessive updates
      })
    );

    // Layout ready handler
    this.app.workspace.onLayoutReady(() => {
      this.initializePanelInSidebar();
    });

  }

  onunload() {
    // Detach the view
    this.app.workspace.detachLeavesOfType(RELATED_NOTES_VIEW_TYPE);
    this.view = null;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    if (this.view) {
      // Trigger a view update if settings change that affect display
      await this.view.updateView();
    }
  }

  async initializePanelInSidebar() {
    // Check if panel already exists
    const existingLeaves = this.app.workspace.getLeavesOfType(RELATED_NOTES_VIEW_TYPE);
    if (existingLeaves.length > 0) {
      return; // Already exists
    }

    // Add panel to right sidebar without opening it
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({
        type: RELATED_NOTES_VIEW_TYPE,
        active: false, // Don't make it active (visible)
      });
    }
  }

  async activateView() {
    // Check if view is already open
    const existingLeaves = this.app.workspace.getLeavesOfType(RELATED_NOTES_VIEW_TYPE);
    if (existingLeaves.length > 0) {
      this.app.workspace.revealLeaf(existingLeaves[0]);
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
            type: RELATED_NOTES_VIEW_TYPE,
            active: true,
        });
        this.app.workspace.revealLeaf(leaf);
        // The view instance is created by the registerView callback
        // and updateView will be called by its onOpen method.
    } else {
        new Notice('Could not Open Related Notes by Tag sidebar: No available leaf.');
    }
  }
}
