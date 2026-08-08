import { App, PluginSettingTab, Setting } from 'obsidian';
import RelatedNotesPlugin from './main';
import { FolderSuggestions } from './folder-suggestions';

export interface FolderExclusion {
  path: string;           // Absolute path from vault root
  includeChildren: boolean; // Whether to exclude subfolders
  id: string;            // Unique identifier for UI management
}

export type NoteDisplayMode = 'title' | 'title-excerpt' | 'excerpt';
export type ExcerptUnit = 'sentences' | 'words' | 'characters';

export interface RelatedNotesSettings {
  defaultSortMode: 'name'|'date'|'created';
  defaultFilterMode: 1 | 2 | 3;
  excludedTags: string;
  defaultGroupState: 'collapsed'|'expanded';
  showMatchedTags: boolean;
  excludedFolders: FolderExclusion[];
  noteDisplayMode: NoteDisplayMode;
  excerptLength: number;
  excerptUnit: ExcerptUnit;
  excerptIncludeHeading: boolean;
}

export const DEFAULT_SETTINGS: RelatedNotesSettings = {
  defaultSortMode: 'name',
  defaultFilterMode: 1,
  excludedTags: '',
  defaultGroupState: 'expanded',
  showMatchedTags: false,
  excludedFolders: [],
  noteDisplayMode: 'title',
  excerptLength: 12,
  excerptUnit: 'words',
  excerptIncludeHeading: true,
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
        .addOption('date', 'Date edited')
        .addOption('created', 'Date created')
        .setValue(this.plugin.settings.defaultSortMode)
        .onChange(async (value: 'name' | 'date' | 'created') => {
          this.plugin.settings.defaultSortMode = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Excluded tags')
      .setDesc('Comma-separated list of tags to exclude from related notes (# prefix optional)')
      .addText(text => text
        // eslint-disable-next-line obsidianmd/ui/sentence-case
        .setPlaceholder('e.g. ignore, draft, #private')
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

    // Zettelkasten/Atomic notes Section
    new Setting(containerEl)
      // eslint-disable-next-line obsidianmd/ui/sentence-case
      .setName('Zettelkasten/Atomic notes')
      .setHeading();

    new Setting(containerEl)
      .setName('Note display')
      .setDesc('Show the note title, an excerpt of its content, or both')
      .addDropdown(dropdown => dropdown
        .addOption('title', 'Title')
        .addOption('title-excerpt', 'Title + excerpt')
        .addOption('excerpt', 'Excerpt')
        .setValue(this.plugin.settings.noteDisplayMode)
        .onChange(async (value: NoteDisplayMode) => {
          this.plugin.settings.noteDisplayMode = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Excerpt length')
      .setDesc('How much of the note to show as an excerpt')
      .addText(text => {
        text.inputEl.type = 'number';
        text.inputEl.min = '1';
        text
          .setValue(String(this.plugin.settings.excerptLength))
          .onChange(async (value) => {
            const parsed = parseInt(value, 10);
            this.plugin.settings.excerptLength = Number.isFinite(parsed) && parsed > 0
              ? parsed
              : DEFAULT_SETTINGS.excerptLength;
            await this.plugin.saveSettings();
          });
        return text;
      })
      .addDropdown(dropdown => dropdown
        .addOption('sentences', 'Sentences')
        .addOption('words', 'Words')
        .addOption('characters', 'Characters')
        .setValue(this.plugin.settings.excerptUnit)
        .onChange(async (value: ExcerptUnit) => {
          this.plugin.settings.excerptUnit = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Include heading in excerpt')
      .setDesc('If a note starts with a heading, include it as part of the excerpt')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.excerptIncludeHeading)
        .onChange(async (value) => {
          this.plugin.settings.excerptIncludeHeading = value;
          await this.plugin.saveSettings();
        }));

    // Folder Exclusion Section
    new Setting(containerEl)
      .setName('Folder exclusion')
      .setDesc('Exclude files from specific folders when finding related notes. Use absolute paths from vault root (e.g., /Personal/Journal).')
      .setHeading();

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
    new Setting(containerEl)
      .setName('Activation and usage')
      .setHeading();

    const instructionsDiv = containerEl.createDiv('related-notes-instructions');
    instructionsDiv.createEl('p', { text: 'To activate the sidebar:' });
    instructionsDiv.createEl('ul', {}, (list) => {
      list.createEl('li', { text: 'Click the ribbon icon (tag icon) in the top right if visible' });
      list.createEl('li', { text: 'Or use the command palette (Cmd/Ctrl+P) and search for "open sidebar"' });
    });
    instructionsDiv.createEl('p', { text: 'Usage:' });
    instructionsDiv.createEl('ul', {}, (list) => {
      list.createEl('li', { text: 'Click tag group header to expand/collapse group' });
      list.createEl('li', { text: 'Click note name to open in current tab' });
      list.createEl('li', { text: 'Cmd/ctrl-click note name to open note in a new tab' });
      list.createEl('li', { text: 'Use the sort dropdown to change sort order' });
    });
  }

  private renderFolderExclusions(container: HTMLElement): void {
    container.empty();
    
    if (this.plugin.settings.excludedFolders.length === 0) {
      container.createEl('p', {
        text: 'No folders excluded yet. Use the button below to add one.',
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
          text.inputEl.addEventListener('input', () => {
            void (async () => {
              const results = await this.folderSuggestions.searchFolders(text.getValue());
              this.folderSuggestions.displayFolderSuggestions(results);
            })();
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
    void this.plugin.saveSettings();
    this.renderFolderExclusions(container);
  }
}
