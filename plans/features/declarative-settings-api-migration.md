# Declarative settings API migration

Migrate `RelatedNotesSettingTab` from the deprecated imperative `display()` to
the declarative `getSettingDefinitions()` API introduced in Obsidian 1.13.0.

Driver: Obsidian review number 2 flagged `display` as deprecated and warned that
settings will not appear in Obsidian's settings search for users on 1.13.0+.

## Decisions taken

- **minAppVersion bumped 1.9.14 -> 1.13.0.** Pure declarative, `display()`
  removed entirely. Keeping both would mean defining every setting twice and
  hand-syncing them forever.
- **"Excerpt length" splits into two rows** ("Excerpt length" number, "Excerpt
  unit" dropdown), since a declarative definition allows one control per row.
  Each becomes independently searchable, which is the point of the migration.

## Framework features replacing hand-rolled code

The migration is a net deletion. Obsidian now provides its own version of three
things this plugin built by hand:

| Hand-rolled today | Replaced by |
| --- | --- |
| `FolderSuggestions` class (98 lines) + suggestion CSS | `AbstractInputSuggest` subclass |
| Folder exclusion add/delete/empty-state rendering | `type: 'list'` with `addItem`, `onDelete`, `emptyState` |
| `parseInt` clamping on number inputs | `type: 'number'` with `min` / `validate` |
| `this.display()` full re-render after reset | `this.update()` |

## Structure

`getSettingDefinitions()` returns a flat array of items:

1. Ungrouped: `Default sort mode`, `Excluded tags`, `Default group state`
2. `type: 'group'`, heading `Titles and excerpts` - note display, excerpt
   length, excerpt unit, include heading, title colour, title font size,
   title font weight
3. `type: 'list'`, heading `Folder exclusion` - one row per exclusion
4. `type: 'group'`, heading `Activation and usage` - static instructions via a
   single `render` item

## Control mapping

| Setting | Key | Definition |
| --- | --- | --- |
| Default sort mode | `defaultSortMode` | `dropdown` |
| Excluded tags | `excludedTags` | `text`, placeholder |
| Default group state | `defaultGroupState` | `dropdown` |
| Note display | `noteDisplayMode` | `dropdown` |
| Excerpt length | `excerptLength` | `number`, `min: 1`, `validate` |
| Excerpt unit | `excerptUnit` | `dropdown` |
| Include heading | `excerptIncludeHeading` | `toggle` |
| Title colour | `titleColor` | `render` (needs reset button) |
| Title font size | `titleFontSize` | `render` (needs reset button) |
| Title font weight | `titleFontWeight` | `dropdown` |
| Folder exclusions | n/a | `list` of `render` rows |

### Why three rows stay `render`

`SettingDefinitionControl` has no per-row extra-button slot (`extraButtons`
exists only on group headers), and the colour/font-size rows need their
"reset to default" affordance plus the existing behaviour where an unset value
seeds from the live computed theme value rather than a hardcoded guess. `render`
is the API's designed escape hatch and hands back a real `Setting`, so those
rows keep their current construction verbatim.

Folder exclusion rows also stay `render`: each row is path + include-subfolders
toggle + delete on one line, which one declarative control per row cannot
express. The list wrapper still supplies add/delete/empty-state.

## Value plumbing

`PluginSettingTab` already reads/writes `this.plugin.settings` by default, but
the default `setControlValue` will not call this plugin's `saveSettings()` -
which clears the excerpt cache and refreshes the open view. Both are overridden:

```ts
getControlValue(key: string): unknown {
  return this.plugin.settings[key as keyof RelatedNotesSettings];
}

async setControlValue(key: string, value: unknown): Promise<void> {
  // assign, then route through saveSettings() for cache clear + view refresh
}
```

## Steps

1. Rewrite `folder-suggestions.ts` as an `AbstractInputSuggest<TFolder>`
   subclass; delete the bespoke dropdown DOM and its CSS.
2. Add `getSettingDefinitions()` to `RelatedNotesSettingTab`; port each setting
   per the table above.
3. Override `getControlValue` / `setControlValue` to route through
   `saveSettings()`.
4. Delete `display()`, `renderFolderExclusions()`, `addNewFolderExclusion()`;
   keep `resolveComputedColor()` / `resolveComputedFontSizePx()` (still used by
   the `render` rows). Swap `this.display()` calls for `this.update()`.
5. Remove the now-dead folder-suggestion CSS from `styles.css`.
6. Bump `minAppVersion` to `1.13.0` in `manifest.json`; add the same to
   `versions.json` for the release version.
7. Lint, build, verify with `--no-inline-config`.

## Verification

Automated checks cannot confirm the settings UI renders correctly - the plugin
has no test harness and settings are rendered by Obsidian itself. Real-world
testing needed for: every control persisting and taking effect, both reset
buttons, folder autocomplete, add/delete exclusions, and the settings-search
entries appearing.

## Risk

`excludedFolders` data shape is unchanged, so existing user settings carry over
untouched. The main risk is UI regression in the folder exclusion list, which is
the most intricate part of the current tab.
