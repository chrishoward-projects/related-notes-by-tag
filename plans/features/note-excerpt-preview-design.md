# Note Excerpt Preview — Design

Date: 2026-08-08

Source: TODO.md — "Add option to show first line of note. Make this both additional and alternative to the title. This is for those using Zettelkasten or atomic note taking which have generic date based titles."

## Overview

Related notes are currently listed by title only (`file.basename`), which is unhelpful for Zettelkasten/atomic-note vaults where titles are often just dates or IDs. This adds an optional excerpt of the note's body text, shown instead of or alongside the title, configurable entirely from the settings tab — no new sidebar controls.

## Settings model

```ts
export type NoteDisplayMode = 'title' | 'title-excerpt' | 'excerpt';
export type ExcerptUnit = 'sentences' | 'words' | 'characters';

interface RelatedNotesSettings {
  // ...existing fields...
  noteDisplayMode: NoteDisplayMode;
  excerptLength: number;
  excerptUnit: ExcerptUnit;
  excerptIncludeHeading: boolean;
}
```

Defaults (`DEFAULT_SETTINGS`):

```ts
noteDisplayMode: 'title',      // zero behaviour change out of the box
excerptLength: 12,
excerptUnit: 'words',
excerptIncludeHeading: true,
```

## Settings UI

New section in `settings.ts`, headed **"Zettelkasten/Atomic notes"** via `.setHeading()`, placed after "Default group state" and before "Folder exclusion" — it's a display setting, same family as sort mode/group state, not a filter.

- **Note display** — dropdown: Title / Title + excerpt / Excerpt
- **Excerpt length** — one `Setting` row combining a number input with a unit dropdown (sentences/words/characters), matching the existing multi-control-per-row pattern already used for folder exclusions
- **Include heading in excerpt** — toggle, default on

All three are always visible regardless of display mode — no conditional show/hide, matching how "Excluded tags" is already always shown regardless of filter mode elsewhere in this settings tab.

## Excerpt extraction rules

New class `ExcerptService`, instantiated in `view.ts`'s constructor alongside `tagAnalyzer`/`previewManager`/`uiRenderer`.

For a given file:

1. Read content via `vault.cachedRead(file)`.
2. Skip past frontmatter using `metadataCache.getFileCache(file)?.frontmatterPosition` — Obsidian has already parsed exactly where frontmatter ends; reuse that instead of hand-rolling `---`-delimiter detection, which would misfire on a body that legitimately opens with a horizontal rule.
3. Skip blank lines. If the first remaining line matches `/^#{1,6}\s+/` (a markdown heading):
   - If `excerptIncludeHeading` is on: strip the `#`s and include the heading text as the start of the excerpt.
   - If off: skip the line entirely, continue from the next line.
4. Build the excerpt per `excerptUnit`/`excerptLength`, counting from the assembled text (heading, if included, plus body):
   - **Sentences** — take the first N complete sentences (split on `.`/`!`/`?`). No mid-sentence truncation applies; a sentence is either fully included or not.
   - **Words/characters** — take the first N words/characters, then truncate back to the last complete word boundary under that limit and append `…`. Never cut mid-word.
5. If there's no usable content after step 2 (empty note, frontmatter-only note), the excerpt is `''`.

Rendering falls back to the title whenever the excerpt is empty, in either `title-excerpt` or `excerpt` mode — no list item is ever left blank.

## Architecture: batching, caching, race safety

`ExcerptService.getExcerptsForFiles(files: TFile[], settings): Promise<Map<string, string>>`:

- Dedupes the input by file path (a note can appear under multiple tag groups).
- Looks up each path in an in-memory cache: `Map<path, { mtime: number, excerpt: string }>`. A cached entry is valid as long as `file.stat.mtime` still matches.
- Reads every cache miss concurrently via `Promise.all`.
- Returns a `path -> excerpt` lookup map.

Cache invalidation: cleared entirely whenever settings are saved (a changed length/unit/heading-toggle invalidates every cached excerpt at once — simpler than tracking which specific setting changed, and settings changes are rare).

`updateView()` calls `getExcerptsForFiles` once, upfront, only when `noteDisplayMode !== 'title'`. Title mode has zero added cost — unchanged from today's fully synchronous render.

**Race guard.** Doing the batched read before the synchronous render means there's exactly one `await` boundary per `updateView()` call. But if the user switches notes again while a previous batch is still in flight, that earlier call's reads can resolve after a newer `updateView()` has already started. Guard with a generation counter, the same pattern used to fix the hover-preview null-`appendChild` race in `preview-manager.ts` earlier this session:

```ts
const generation = ++this.renderGeneration;
const excerpts = this.plugin.settings.noteDisplayMode === 'title'
  ? new Map<string, string>()
  : await this.excerptService.getExcerptsForFiles(files, this.plugin.settings);
if (generation !== this.renderGeneration) return; // a newer updateView() has since started
```

**Typing performance.** `metadataCache.on('changed')` re-runs `updateView()` on every keystroke that changes the active file's parsed metadata (e.g. completing a tag). Most related files stay the same across consecutive keystrokes, so their excerpts hit the cache — free, no disk read. Only newly-matching files cost anything, and while typing a brand-new tag character by character there can be a burst of cache misses until the tag settles, bounded by however many notes share that specific partial tag string (usually small or zero). This is on top of the full related-notes recompute that already happens on every keystroke today, independent of this feature.

Not building pre-emptively, but available if typing lag turns out to be noticeable in practice: debounce the `metadataCache.on('changed')` handler the same way `active-leaf-change` already is (`TIMEOUTS.VIEW_UPDATE_DELAY`), collapsing a keystroke burst into one re-render.

## Rendering & CSS

`createFileLink` behaviour by mode:

- **Title** — unchanged.
- **Title + excerpt** — existing `<a>` title stays; a new `<div class="related-notes-excerpt">` sibling underneath shows the excerpt (muted/smaller, via `var(--text-muted)`).
- **Excerpt** — the excerpt text becomes the `<a>`'s content instead of the title, falling back to the title if the excerpt is empty.

The excerpt element shares the same click-to-open and Cmd/Ctrl-hover-to-preview behaviour as the title (`setupFileLinkEvents`), so the whole block is one consistent click/hover target, not just the title line.

New CSS class `related-notes-excerpt` added to `styles.css`.

## Known limitation, accepted

If a *related* (non-active) note is edited in another pane, its cached excerpt goes stale until something re-triggers `updateView()` for the currently active note (e.g. switching away and back) — `metadataCache.on('changed')` only re-renders when the *active* file's metadata changes. This matches the plugin's existing update-triggering behaviour (titles/tags already only refresh on active-file change), so it's not a new inconsistency introduced by this feature.

## Out of scope

- No sidebar/frontend control for switching display mode — settings-tab only, per requirements.
- No persistence of the excerpt cache across Obsidian restarts — in-memory only, rebuilds naturally within seconds of normal use.
- No debounce on the metadata-changed handler — left as a documented follow-up, not built until real-world use shows it's needed.
