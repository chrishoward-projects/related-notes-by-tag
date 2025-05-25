import { Plugin, WorkspaceLeaf, TFile, Notice, addIcon } from 'obsidian';
import { RelatedNotesSettings, DEFAULT_SETTINGS, RelatedNotesSettingTab } from './settings';
import { RelatedNotesView, RELATED_NOTES_VIEW_TYPE } from './view';

export default class RelatedNotesPlugin extends Plugin {
  settings: RelatedNotesSettings;
  private view: RelatedNotesView | null = null;

  async onload() {
    console.log('Loading Related Notes by Tag plugin');

    await this.loadSettings();

    // Register the view
    this.registerView(
      RELATED_NOTES_VIEW_TYPE,
      (leaf) => {
        this.view = new RelatedNotesView(leaf, this);
        return this.view;
      }
    );

    // Add a ribbon icon to activate the view
    addIcon('related-notes-icon', `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tags"><path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z"/><path d="M6 9.01V9"/><path d="m15 5 6.3 6.3a2.69 2.69 0 0 1 0 3.79L17.5 19a2.69 2.69 0 0 1-3.79 0L10 15.21"/></svg>`);
    this.addRibbonIcon('related-notes-icon', 'Open Related Notes Panel', () => {
      this.activateView();
    });

    // Add a command to activate the view
    this.addCommand({
      id: 'open-related-notes-panel',
      name: 'Open Related Notes Panel',
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
          }, 50); // Increased delay to 50ms
        }
      })
    );

    this.registerEvent(
      this.app.metadataCache.on('changed', async (file) => {
        // Only update if the changed file is the active file and the view is open
        if (this.view && this.app.workspace.getActiveFile()?.path === file.path) {
          await this.view.updateView();
        }
        // Consider if other files changing should trigger an update if their tags match current note's tags
        // For now, keeping it simple to reduce excessive updates.
      })
    );

    // Activate the view if a file is already open
    this.app.workspace.onLayoutReady(async () => {
        const activeFile = this.app.workspace.getActiveFile();
        // if (activeFile) {
        //     // Check if view is already open to avoid opening multiple
        //     let leaf = this.app.workspace.getLeavesOfType(RELATED_NOTES_VIEW_TYPE)[0];
        //     if (leaf) {
        //         this.app.workspace.revealLeaf(leaf);
        //         if (this.view) {
        //             await this.view.updateView();
        //         }
        //     }
        //     // If not open, and user wants it to open by default, or based on a setting.
        //     // For now, we don't auto-open it, user uses ribbon/command.
        // }
    });

    console.log('Related Notes by Tag plugin loaded.');
  }

  onunload() {
    console.log('Unloading Related Notes by Tag plugin');
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
        new Notice('Could not open Related Notes panel: No available leaf.');
    }
  }
}
