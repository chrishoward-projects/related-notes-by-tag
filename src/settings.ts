import { App, PluginSettingTab, Setting } from 'obsidian';
import RelatedNotesPlugin from './main';
import { FolderSuggestions } from './folder-suggestions';

export interface FolderExclusion {
  path: string;           // Absolute path from vault root
  includeChildren: boolean; // Whether to exclude subfolders
  id: string;            // Unique identifier for UI management
}

export interface RelatedNotesSettings {
  defaultSortMode: 'name'|'date'|'created';
  defaultFilterMode: 1 | 2 | 3;
  excludedTags: string;
  defaultGroupState: 'collapsed'|'expanded';
  showMatchedTags: boolean;
  excludedFolders: FolderExclusion[];
}

export const DEFAULT_SETTINGS: RelatedNotesSettings = {
  defaultSortMode: 'name',
  defaultFilterMode: 1,
  excludedTags: '',
  defaultGroupState: 'expanded',
  showMatchedTags: false,
  excludedFolders: [],
};

export class RelatedNotesSettingTab extends PluginSettingTab {
  plugin: RelatedNotesPlugin;
  private folderSuggestions: FolderSuggestions;

  constructor(app: App, plugin: RelatedNotesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.folderSuggestions = new FolderSuggestions(app);
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Default sort mode')
      .setDesc('Default sort method for related notes')
      .addDropdown(dropdown => dropdown
        .addOption('name', 'Name')
        .addOption('date', 'Date Edited')
        .addOption('created', 'Date Created')
        .setValue(this.plugin.settings.defaultSortMode)
        .onChange(async (value: 'name' | 'date' | 'created') => {
          this.plugin.settings.defaultSortMode = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Excluded tags')
      .setDesc('Comma-separated list of tags to exclude from related notes (# prefix optional)')
      .addText(text => text
        .setPlaceholder('e.g., ignore, draft, #private')
        .setValue(this.plugin.settings.excludedTags)
        .onChange(async (value) => {
          this.plugin.settings.excludedTags = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default group state')
      .setDesc('Initial expansion state of tag groups')
      .addDropdown(dropdown => dropdown
        .addOption('collapsed', 'Collapsed')
        .addOption('expanded', 'Expanded')
        .setValue(this.plugin.settings.defaultGroupState)
        .onChange(async (value: 'collapsed'|'expanded') => {
          this.plugin.settings.defaultGroupState = value;
          await this.plugin.saveSettings();
        }));

    // Folder Exclusion Section
    containerEl.createEl('h3', { text: 'Folder Exclusion' });
    containerEl.createEl('p', {
      text: 'Exclude files from specific folders when finding related notes. Use absolute paths from vault root (e.g., /Personal/Journal).',
      cls: 'setting-item-description'
    });

    // Container for folder exclusion list
    const folderExclusionContainer = containerEl.createDiv('folder-exclusion-container');

    // Render existing exclusions
    this.renderFolderExclusions(folderExclusionContainer);

    // Add new folder button
    new Setting(containerEl)
      .setName('Add another exclusion')
      .setDesc('Add a new folder to exclude from related notes')
      .addButton(button => button
        .setIcon('folder-plus')
        .setTooltip('Add another folder exclusion')
        .setCta()
        .onClick(() => {
          this.addNewFolderExclusion(folderExclusionContainer);
        }));

    // Add static instructions
   containerEl.createEl('h3', { text: 'Activation and usage instructions' });
   const instructionsDiv = containerEl.createDiv('related-notes-instructions');
    instructionsDiv.createEl('p', { text: 'To activate the Related Notes by Tag sidebar:' });
    instructionsDiv.createEl('ul', {}, (list) => {
      list.createEl('li', { text: 'Click the ribbon icon (tag icon) in the top right if visible' });
      list.createEl('li', { text: 'Or use the command palette (cmd/ctrl-P) and search for: "Related Notes by Tag: Open sidebar"' });
    });
    instructionsDiv.createEl('p', { text: 'Usage:' });
    instructionsDiv.createEl('ul', {}, (list) => {
      list.createEl('li', { text: 'Click tag group header to expand/collapse group' });
      list.createEl('li', { text: 'Click note name to open in current tab' });
      list.createEl('li', { text: 'Cmd/ctrl-click note name to open note in a new tab' });
      list.createEl('li', { text: 'Click Name/Date to change sort order' });
    });
  }

  private renderFolderExclusions(container: HTMLElement): void {
    container.empty();
    
    if (this.plugin.settings.excludedFolders.length === 0) {
      container.createEl('p', {
        text: 'No folders excluded yet. Click "Add Folder Path" to create one.',
        cls: 'setting-item-description'
      });
      return;
    }
    
    this.plugin.settings.excludedFolders.forEach((exclusion, index) => {
      const setting = new Setting(container);
      
      // Create description element that we can update dynamically
      const updateDescription = () => {
        const desc = exclusion.includeChildren ? ' (selected folder plus subfolders)' : ' (selected folder only)';
        setting.descEl.empty();
        setting.descEl.createSpan({ 
          text: `${index + 1}: ${exclusion.path || '(empty)'}${desc}`,
          cls: 'setting-item-description'
        });
      };
      
      setting
        .addText(text => {
          text
            .setPlaceholder('/path/to/folder')
            .setValue(exclusion.path)
            .onChange(async (value) => {
              this.plugin.settings.excludedFolders[index].path = value;
              await this.plugin.saveSettings();
              updateDescription(); // Update description when path changes
            });
          
          // Add folder suggestions functionality
          text.inputEl.addEventListener('input', async () => {
            const results = await this.folderSuggestions.searchFolders(text.getValue());
            this.folderSuggestions.displayFolderSuggestions(results);
          });
          
          return text;
        })
        .addToggle(toggle => toggle
          .setTooltip('Include subfolders')
          .setValue(exclusion.includeChildren)
          .onChange(async (value) => {
            this.plugin.settings.excludedFolders[index].includeChildren = value;
            await this.plugin.saveSettings();
            updateDescription(); // Update description when toggle changes
          }))
        .addButton(button => {
          button
            .setIcon('trash-2')
            .setTooltip('Delete folder exclusion')
            .onClick(async () => {
              this.plugin.settings.excludedFolders.splice(index, 1);
              await this.plugin.saveSettings();
              this.renderFolderExclusions(container);
            });
          
          // Apply CSS class for styling
          button.buttonEl.addClass('folder-exclusion-delete-btn');
          
          return button;
        });
      
      // Set initial description
      updateDescription();
    });
  }

  private addNewFolderExclusion(container: HTMLElement): void {
    const newExclusion: FolderExclusion = {
      path: '',
      includeChildren: true,
      id: Date.now().toString()
    };
    
    this.plugin.settings.excludedFolders.push(newExclusion);
    this.plugin.saveSettings();
    this.renderFolderExclusions(container);
  }
}
