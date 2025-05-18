import { App, PluginSettingTab, Setting } from 'obsidian';
import RelatedNotesPlugin from './main'; // Adjust if main.ts is named differently or located elsewhere

export interface RelatedNotesSettings {
  exampleSetting: string;
  // Display Options
  showTitleOnly: boolean;
  showNotePath: boolean;
  maxNotesPerTag: number;
  // Filtering Options
  minTagMatchThreshold: number;
  excludedTags: string; // Comma-separated string
  prioritizedTags: string; // Comma-separated string
  // Appearance Settings
  customCssClass: string;
  useCompactView: boolean;
  customSidebarTitle: string;
  // Behaviour Settings
  autoRefreshInterval: number; // in seconds, 0 for no auto-refresh
  enableCache: boolean;
  excludedFolders: string; // Comma-separated string
}

export const DEFAULT_SETTINGS: RelatedNotesSettings = {
  exampleSetting: 'default value',
  showTitleOnly: false,
  showNotePath: true,
  maxNotesPerTag: 10,
  minTagMatchThreshold: 1,
  excludedTags: '',
  prioritizedTags: '',
  customCssClass: '',
  useCompactView: false,
  customSidebarTitle: 'Related Notes',
  autoRefreshInterval: 0,
  enableCache: true,
  excludedFolders: '',
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

    containerEl.createEl('h2', { text: 'Related Notes by Tag Settings' });

    new Setting(containerEl)
      .setName('Example Setting')
      .setDesc('This is an example setting for demonstration.')
      .addText(text => text
        .setPlaceholder('Enter something')
        .setValue(this.plugin.settings.exampleSetting)
        .onChange(async (value) => {
          this.plugin.settings.exampleSetting = value;
          await this.plugin.saveSettings();
        }));

    // Placeholder for future settings - to be implemented in Phase 2
    containerEl.createEl('p', { text: 'More settings will be available in future versions.' });
    containerEl.createEl('h3', { text: 'Display Options (Phase 2)' });
    containerEl.createEl('h3', { text: 'Filtering Options (Phase 2)' });
    containerEl.createEl('h3', { text: 'Appearance Settings (Phase 2)' });
    containerEl.createEl('h3', { text: 'Behaviour Settings (Phase 2)' });

  }
}
