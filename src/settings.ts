import { App, PluginSettingTab, Setting } from 'obsidian';
import RelatedNotesPlugin from './main';

export interface RelatedNotesSettings {
  defaultSortMode: 'name'|'date'|'created';
  defaultFilterMode: 1 | 2 | 3;
  excludedTags: string;
  defaultGroupState: 'collapsed'|'expanded';
  showMatchedTags: boolean;
}

export const DEFAULT_SETTINGS: RelatedNotesSettings = {
  defaultSortMode: 'name',
  defaultFilterMode: 1,
  excludedTags: '',
  defaultGroupState: 'expanded',
  showMatchedTags: false,
};

export class RelatedNotesSettingTab extends PluginSettingTab {
  plugin: RelatedNotesPlugin;

  constructor(app: App, plugin: RelatedNotesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl('h2',{text:'Related Notes by Tag'});

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

    // Add static instructions
   containerEl.createEl('h3', { text: 'Activation and usage instructions' });
   const instructionsDiv = containerEl.createDiv('related-notes-instructions');
    instructionsDiv.createEl('p', { text: 'To activate the Related Notes by Tag sidebar:' });
    instructionsDiv.createEl('ul', {}, (list) => {
      list.createEl('li', { text: 'Click the ribbon icon (tag icon)' });
      list.createEl('li', { text: 'Or use the command palette: "Open Related Notes by Tag sidebar"' });
    });
    instructionsDiv.createEl('p', { text: 'Usage:' });
    instructionsDiv.createEl('ul', {}, (list) => {
      list.createEl('li', { text: 'Click tag group header to expand/collapse group' });
      list.createEl('li', { text: 'Click note name to open in current tab' });
      list.createEl('li', { text: 'Cmd/ctrl-click note name to open note in a new tab' });
      list.createEl('li', { text: 'Click Name/Date to change sort order' });
    });  }
}
