import { App, PluginSettingTab, Setting, SettingDefinitionItem, SettingDefinitionList } from 'obsidian';
import RelatedNotesPlugin from './main';
import { FolderSuggest } from './folder-suggestions';

export interface FolderExclusion {
  path: string;           // Absolute path from vault root
  includeChildren: boolean; // Whether to exclude subfolders
  id: string;            // Unique identifier for UI management
}

export type NoteDisplayMode = 'title' | 'title-excerpt' | 'excerpt';
export type ExcerptUnit = 'sentences' | 'words' | 'characters';

export interface RelatedNotesSettings {
  defaultSortMode: 'name'|'date'|'created';
  defaultFilterMode: 1 | 2 | 3 | 'all';
  defaultTagSortMode: 'name' | 'count';
  excludedTags: string;
  defaultGroupState: 'collapsed'|'expanded';
  showMatchedTags: boolean;
  showNotesInAllTagGroups: boolean;
  listViewMode: 'tag' | 'title';
  excludedFolders: FolderExclusion[];
  noteDisplayMode: NoteDisplayMode;
  excerptLength: number;
  excerptUnit: ExcerptUnit;
  excerptIncludeHeading: boolean;
  titleColor: string;
  titleFontSize: number;
  titleFontWeight: string;
  /** Internal, not user-facing: tracks the one-time Obsidian upgrade notice. */
  upgradeNoticeShown: boolean;
}

export const DEFAULT_SETTINGS: RelatedNotesSettings = {
  defaultSortMode: 'name',
  defaultFilterMode: 1,
  defaultTagSortMode: 'count',
  excludedTags: '',
  defaultGroupState: 'expanded',
  showMatchedTags: false,
  showNotesInAllTagGroups: true,
  listViewMode: 'tag',
  excludedFolders: [],
  noteDisplayMode: 'title',
  excerptLength: 12,
  excerptUnit: 'words',
  excerptIncludeHeading: true,
  titleColor: '',
  titleFontSize: 0,
  titleFontWeight: '',
  upgradeNoticeShown: false,
};

const SUBFOLDER_DESC = {
  included: 'Selected folder plus subfolders',
  excluded: 'Selected folder only',
};

export class RelatedNotesSettingTab extends PluginSettingTab {
  plugin: RelatedNotesPlugin;

  constructor(app: App, plugin: RelatedNotesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: 'Default sort mode',
        desc: 'Default sort method for related notes',
        control: {
          type: 'dropdown',
          key: 'defaultSortMode',
          options: { name: 'Name', date: 'Date edited', created: 'Date created' },
        },
      },
      {
        name: 'Excluded tags',
        desc: 'Comma-separated list of tags to exclude from related notes (# prefix optional)',
        control: {
          type: 'text',
          key: 'excludedTags',
          placeholder: 'For example: ignore, draft, #private',
        },
      },
      {
        name: 'Default group state',
        desc: 'Initial expansion state of tag groups',
        control: {
          type: 'dropdown',
          key: 'defaultGroupState',
          options: { collapsed: 'Collapsed', expanded: 'Expanded' },
        },
      },
      {
        name: 'Show notes in all matching tag groups',
        desc: 'When off, each note is listed once only, under the first of its tags alphabetically, with the number of tags it matched shown beside it. Use the show matched tags button in the panel to see which tags a note has.',
        control: { type: 'toggle', key: 'showNotesInAllTagGroups' },
      },
      {
        type: 'group',
        heading: 'Titles and excerpts',
        // Individual definitions take no class of their own, so the group
        // carries the hook the narrow number inputs are styled through
        cls: 'related-notes-number-settings',
        items: [
          {
            name: 'Note display',
            desc: 'Show the note title, an excerpt of its content, or both. Zettelkasten and atomic-note vaults benefit most, where titles are generic dates or identifiers - though it is a handy preview even when titles are already descriptive.',
            control: {
              type: 'dropdown',
              key: 'noteDisplayMode',
              options: { 'title': 'Title', 'title-excerpt': 'Title + excerpt', 'excerpt': 'Excerpt' },
            },
          },
          {
            name: 'Excerpt length',
            desc: 'How much of the note to show as an excerpt',
            control: {
              type: 'number',
              key: 'excerptLength',
              min: 1,
              defaultValue: DEFAULT_SETTINGS.excerptLength,
              validate: (value: number) =>
                Number.isFinite(value) && value > 0 ? undefined : 'Enter a number above zero.',
            },
          },
          {
            name: 'Excerpt unit',
            desc: 'The unit the excerpt length is counted in',
            control: {
              type: 'dropdown',
              key: 'excerptUnit',
              options: { sentences: 'Sentences', words: 'Words', characters: 'Characters' },
            },
          },
          {
            name: 'Include heading in excerpt',
            desc: 'If a note starts with a heading, include it as part of the excerpt',
            control: { type: 'toggle', key: 'excerptIncludeHeading' },
          },
          {
            name: 'Title colour',
            desc: 'Colour of the note title/excerpt link. Defaults to your theme\'s normal text colour.',
            render: (setting: Setting) => {
              setting
                .addColorPicker(picker => picker
                  .setValue(this.plugin.settings.titleColor || this.resolveComputedColor('--text-normal'))
                  .onChange((value) => {
                    this.plugin.settings.titleColor = value;
                    void this.plugin.saveSettings();
                  }))
                .addExtraButton(button => button
                  .setIcon('rotate-ccw')
                  .setTooltip('Reset to default')
                  .onClick(() => {
                    this.plugin.settings.titleColor = '';
                    void this.plugin.saveSettings();
                    this.update();
                  }));
            },
          },
          {
            name: 'Title font size',
            desc: 'Font size in pixels for the note title/excerpt link.',
            render: (setting: Setting) => {
              setting
                .addText(text => {
                  text.inputEl.type = 'number';
                  text.inputEl.min = '1';
                  text.inputEl.addClass('related-notes-narrow-number-input');
                  return text
                    .setValue(String(this.plugin.settings.titleFontSize || this.resolveComputedFontSizePx('--font-ui-smaller')))
                    .onChange((value) => {
                      const parsed = parseInt(value, 10);
                      this.plugin.settings.titleFontSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
                      void this.plugin.saveSettings();
                    });
                })
                .addExtraButton(button => button
                  .setIcon('rotate-ccw')
                  .setTooltip('Reset to default')
                  .onClick(() => {
                    this.plugin.settings.titleFontSize = 0;
                    void this.plugin.saveSettings();
                    this.update();
                  }));
            },
          },
          {
            name: 'Title font weight',
            desc: 'Font weight for the note title/excerpt link',
            control: {
              type: 'dropdown',
              key: 'titleFontWeight',
              options: { '': 'Default', '400': 'Normal', '500': 'Medium', '600': 'Semibold', '700': 'Bold' },
            },
          },
        ],
      },
      this.buildFolderExclusionList(),
      {
        type: 'group',
        heading: 'Activation and usage',
        items: [
          {
            name: 'Opening the panel',
            desc: this.buildActivationInstructions(),
          },
          {
            name: 'Using the panel',
            desc: this.buildUsageInstructions(),
          },
        ],
      },
    ];
  }

  /**
   * Reads and writes route through the plugin's own saveSettings() rather than
   * the default auto-persist, because saving here also has to clear the excerpt
   * cache and refresh the open panel.
   */
  getControlValue(key: string): unknown {
    return this.plugin.settings[key as keyof RelatedNotesSettings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    (this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
    if (key === 'defaultGroupState') {
      // Groups opened or closed in the panel would otherwise win over this
      this.plugin.resetGroupStates();
    }
    await this.plugin.saveSettings();
  }

  private buildFolderExclusionList(): SettingDefinitionList {
    const exclusions = this.plugin.settings.excludedFolders;

    return {
      type: 'list',
      heading: 'Folder exclusion',
      emptyState: 'No folders excluded yet. Add one to leave its files out of related notes, using an absolute path from the vault root such as /projects/archive.',
      addItem: {
        name: 'Add folder exclusion',
        action: () => {
          exclusions.push({ path: '', includeChildren: true, id: Date.now().toString() });
          void this.plugin.saveSettings();
          this.update();
        },
      },
      onDelete: (index: number) => {
        exclusions.splice(index, 1);
        void this.plugin.saveSettings();
        this.update();
      },
      items: exclusions.map((exclusion, index) => ({
        name: `Exclusion ${index + 1}`,
        desc: exclusion.includeChildren ? SUBFOLDER_DESC.included : SUBFOLDER_DESC.excluded,
        // A render row, because path plus subfolder toggle is two controls on
        // one line, which a single declarative control cannot express.
        render: (setting: Setting) => {
          setting
            .addText(text => {
              text.setPlaceholder('/projects/archive').setValue(exclusion.path);
              new FolderSuggest(this.app, text.inputEl, (path) => {
                exclusion.path = path;
                void this.plugin.saveSettings();
              });
              return text.onChange((value) => {
                exclusion.path = value;
                void this.plugin.saveSettings();
              });
            })
            .addToggle(toggle => toggle
              .setTooltip('Include subfolders')
              .setValue(exclusion.includeChildren)
              .onChange((value) => {
                exclusion.includeChildren = value;
                setting.setDesc(value ? SUBFOLDER_DESC.included : SUBFOLDER_DESC.excluded);
                void this.plugin.saveSettings();
              }));
        },
      })),
    };
  }

  private buildActivationInstructions(): DocumentFragment {
    return createFragment((frag) => {
      frag.createEl('ul', {}, (list) => {
        list.createEl('li', { text: 'On desktop, open from the right sidebar ribbon menu. If not visible, use the command palette (Ctrl/Cmd+P) and search for "Related Notes by Tag: Open sidebar"' });
        list.createEl('li', { text: 'On mobile, swipe left from the right edge of the screen to reveal the right sidebar' });
      });
    });
  }

  private buildUsageInstructions(): DocumentFragment {
    return createFragment((frag) => {
      frag.createEl('ul', {}, (list) => {
        list.createEl('li', { text: 'Use the toolbar buttons to switch between tag and title views, sort notes, sort tag groups, filter by tag matches, show matched tags and expand or collapse all groups' });
        list.createEl('li', { text: 'Click tag group header to expand/collapse group' });
        list.createEl('li', { text: 'Click note name to open in current tab' });
        list.createEl('li', { text: 'Cmd/ctrl-click note name to open note in a new tab' });
        list.createEl('li', { text: 'Cmd/ctrl-hover note name to preview it' });
        list.createEl('li', { text: 'Search the listed notes by word or #tag; prefix a term with - to exclude' });
        list.createEl('li', { text: 'Use the icon beside the search field to toggle matching any or all words/tags' });
      });
    });
  }

  /**
   * Probes in the main workspace rather than the settings tab: since 1.13
   * settings open in their own window, so a probe rooted here would measure
   * that window rather than the one the panel actually renders in.
   */
  private resolveComputedColor(cssVar: string): string {
    const rgb = this.probeComputedStyle(`color: var(${cssVar});`, style => style.color);

    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return '#000000';
    const [r, g, b] = match.map(Number);
    return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
  }

  private resolveComputedFontSizePx(cssVar: string): number {
    const fontSize = this.probeComputedStyle(`font-size: var(${cssVar});`, style => style.fontSize);
    return parseFloat(fontSize) || 13;
  }

  private probeComputedStyle(style: string, read: (computed: CSSStyleDeclaration) => string): string {
    const host = this.app.workspace.containerEl;
    const probe = host.createSpan({ attr: { style: `${style} display: none;` } });
    const win = host.ownerDocument.defaultView ?? activeWindow;
    const value = read(win.getComputedStyle(probe));
    probe.remove();
    return value;
  }
}
