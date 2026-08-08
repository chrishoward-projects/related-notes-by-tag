# Note Excerpt Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users show a configurable excerpt of a related note's body text instead of, or alongside, its title — for Zettelkasten/atomic-note vaults where titles are generic dates or IDs.

**Architecture:** A new `ExcerptService` reads and caches excerpt text per file (async, `vault.cachedRead` + `frontmatterPosition`-based frontmatter skip). `RelatedNotesView.updateView()` batches one deduplicated read across all currently-related files before its existing synchronous render, guarded by a generation counter against stale results from a superseded render. Settings-tab-only configuration; the render itself only pays the async cost when the feature is enabled.

**Tech Stack:** TypeScript, Obsidian Plugin API, esbuild. No test framework exists in this project — verification is `npm run lint && npm run build` plus manual testing in Obsidian, matching how every other feature/fix in this repo has been verified.

**Spec:** `plans/features/note-excerpt-preview-design.md`

## Global Constraints

- No new sidebar/frontend control — settings-tab only.
- Zero added cost when `noteDisplayMode` is `'title'` (the default) — no file reads, no behaviour change from today.
- No `!important` in CSS; use Obsidian CSS variables, not hardcoded colours/sizes.
- Use Obsidian DOM helpers (`createDiv`, `createEl`) — no `document.createElement`.
- Sentence case for all setting names/descriptions.
- No automated test framework — verify with `npm run lint`, `npm run build`, and manual testing in Obsidian as described in each task.
- English (AU) spelling in comments, commit messages, and CHANGELOG prose (not in code identifiers, which follow the API's own naming).
- Version bump is deferred to the final task only — intermediate tasks are plain commits, no version bump each. This is a single coupled feature (unlike the six independent review-fix phases from earlier), so intermediate states aren't independently shippable.
- Target version: **0.6.0** (minor bump from 0.5.0 — new functionality, per semver as this project already follows in CHANGELOG.md).

---

### Task 1: Settings model and settings UI

**Files:**
- Modify: `src/settings.ts:11-18` (interface), `src/settings.ts:20-27` (defaults), `src/settings.ts:69-79` (insert new section after this point, before the "Folder Exclusion Section" comment at line 81)

**Interfaces:**
- Produces: `NoteDisplayMode` type (`'title' | 'title-excerpt' | 'excerpt'`), `ExcerptUnit` type (`'sentences' | 'words' | 'characters'`), and four new fields on `RelatedNotesSettings`: `noteDisplayMode: NoteDisplayMode`, `excerptLength: number`, `excerptUnit: ExcerptUnit`, `excerptIncludeHeading: boolean`. Both types are exported from `src/settings.ts`.

- [ ] **Step 1: Add the new types, interface fields, and defaults**

In `src/settings.ts`, add above `RelatedNotesSettings`:

```typescript
export type NoteDisplayMode = 'title' | 'title-excerpt' | 'excerpt';
export type ExcerptUnit = 'sentences' | 'words' | 'characters';
```

Extend the interface:

```typescript
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
```

Extend the defaults:

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint && npm run build`
Expected: both succeed with no errors (nothing consumes the new fields yet, so this only checks the type additions themselves are valid).

- [ ] **Step 3: Add the settings UI section**

In `src/settings.ts`, inside `display()`, insert this immediately after the "Default group state" `Setting` block (which ends just before the `// Folder Exclusion Section` comment):

```typescript
    // Zettelkasten/Atomic notes Section
    new Setting(containerEl)
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

```

- [ ] **Step 4: Verify and manually test the settings UI**

Run: `npm run lint && npm run build`
Expected: both succeed.

Manual check in Obsidian (reload the plugin first): open Settings → Related Notes by Tag. Confirm a new "Zettelkasten/Atomic notes" heading appears after "Default group state", with three controls: "Note display" (dropdown defaulting to Title), "Excerpt length" (number input defaulting to 12, unit dropdown defaulting to Words), "Include heading in excerpt" (toggle, on by default). Change each control, close and reopen the settings tab, and confirm the values persisted. The sidebar itself won't change yet — nothing reads these settings until Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/settings.ts
git commit -m "$(cat <<'EOF'
Add settings for note excerpt display

Adds noteDisplayMode, excerptLength, excerptUnit, and excerptIncludeHeading
to RelatedNotesSettings, plus a new "Zettelkasten/Atomic notes" settings
section. Not yet wired into rendering.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: ExcerptService

**Files:**
- Create: `src/excerpt-service.ts`

**Interfaces:**
- Consumes: `RelatedNotesSettings` type from `src/settings.ts` (Task 1) — specifically the `excerptLength: number`, `excerptUnit: ExcerptUnit`, `excerptIncludeHeading: boolean` fields.
- Produces: `class ExcerptService { constructor(app: App); clearCache(): void; getExcerptsForFiles(files: TFile[], settings: RelatedNotesSettings): Promise<Map<string, string>>; }`, exported from `src/excerpt-service.ts`. The returned map is keyed by `file.path`. `getExcerptsForFiles` deduplicates its input by path internally — callers do not need to deduplicate first.

- [ ] **Step 1: Create the file with the full implementation**

Create `src/excerpt-service.ts`:

```typescript
import { App, TFile } from 'obsidian';
import { RelatedNotesSettings } from './settings';

interface CacheEntry {
  mtime: number;
  excerpt: string;
}

export class ExcerptService {
  private cache: Map<string, CacheEntry> = new Map();

  constructor(private app: App) {}

  clearCache(): void {
    this.cache.clear();
  }

  async getExcerptsForFiles(files: TFile[], settings: RelatedNotesSettings): Promise<Map<string, string>> {
    const uniqueFiles = new Map<string, TFile>();
    files.forEach(file => uniqueFiles.set(file.path, file));

    const result = new Map<string, string>();
    const misses: TFile[] = [];

    uniqueFiles.forEach(file => {
      const cached = this.cache.get(file.path);
      if (cached && cached.mtime === file.stat.mtime) {
        result.set(file.path, cached.excerpt);
      } else {
        misses.push(file);
      }
    });

    await Promise.all(misses.map(async file => {
      const excerpt = await this.buildExcerpt(file, settings);
      this.cache.set(file.path, { mtime: file.stat.mtime, excerpt });
      result.set(file.path, excerpt);
    }));

    return result;
  }

  private async buildExcerpt(file: TFile, settings: RelatedNotesSettings): Promise<string> {
    const content = await this.app.vault.cachedRead(file);
    const body = this.stripFrontmatter(file, content);
    const text = this.prepareText(body, settings.excerptIncludeHeading);
    if (!text) return '';

    if (settings.excerptUnit === 'sentences') {
      return this.takeSentences(text, settings.excerptLength);
    }
    if (settings.excerptUnit === 'words') {
      return this.takeWords(text, settings.excerptLength);
    }
    return this.takeCharacters(text, settings.excerptLength);
  }

  private stripFrontmatter(file: TFile, content: string): string {
    const position = this.app.metadataCache.getFileCache(file)?.frontmatterPosition;
    if (!position) return content;
    return content.slice(position.end.offset);
  }

  private prepareText(body: string, includeHeading: boolean): string {
    const lines = body.split('\n');
    let startIndex = 0;

    while (startIndex < lines.length && lines[startIndex].trim() === '') {
      startIndex++;
    }

    if (startIndex >= lines.length) return '';

    const headingMatch = lines[startIndex].match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      if (!includeHeading) {
        startIndex++;
        while (startIndex < lines.length && lines[startIndex].trim() === '') {
          startIndex++;
        }
      } else {
        lines[startIndex] = headingMatch[1];
      }
    }

    return lines.slice(startIndex).join(' ').replace(/\s+/g, ' ').trim();
  }

  private takeSentences(text: string, count: number): string {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
    return sentences.slice(0, count).join('').trim();
  }

  private takeWords(text: string, count: number): string {
    const words = text.split(' ').filter(w => w.length > 0);
    if (words.length <= count) return words.join(' ');
    return words.slice(0, count).join(' ') + '…';
  }

  private takeCharacters(text: string, count: number): string {
    if (text.length <= count) return text;
    const slice = text.slice(0, count);
    const lastSpace = slice.lastIndexOf(' ');
    const trimmed = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
    return trimmed.trim() + '…';
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint && npm run build`
Expected: both succeed.

This class isn't wired into anything yet, so there's no runtime behaviour to observe in Obsidian at this point — that happens in Task 3. Before moving on, trace the algorithm by hand against the design spec's own worked example to catch logic errors while the code is fresh:

- Note body (after frontmatter): `"# Fleeting thought on memory\n\nSome body text follows after this."`, `excerptIncludeHeading: true`, `excerptUnit: 'words'`, `excerptLength: 6`.
- `prepareText` finds the heading, `includeHeading` is true, so line becomes `"Fleeting thought on memory"`; joined with the remaining lines and space-normalized: `"Fleeting thought on memory Some body text follows after this."`
- `takeWords` with count 6: `["Fleeting","thought","on","memory","Some","body"]` → `"Fleeting thought on memory Some body…"` — matches the design doc's worked example.

- [ ] **Step 3: Commit**

```bash
git add src/excerpt-service.ts
git commit -m "$(cat <<'EOF'
Add ExcerptService for building note body excerpts

Reads file content via vault.cachedRead, skips frontmatter using the
metadata cache's frontmatterPosition, optionally strips or includes a
leading heading, and builds an excerpt by sentence/word/character count
with word-boundary truncation. Batches and caches by file path + mtime.
Not yet wired into the view.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Wire excerpts into the sidebar render

**Files:**
- Modify: `src/constants.ts:9-33` (CSS_CLASSES)
- Modify: `src/view.ts` (class fields, constructor, `updateView`, `renderTagGroups`, `renderFileList`, `createFileLink`)
- Modify: `src/main.ts:88-95` (`saveSettings`)
- Modify: `styles.css` (new rule after the existing `.related-notes-list-item a:hover` block)

**Interfaces:**
- Consumes: `ExcerptService` (Task 2) — `constructor(app: App)`, `clearCache(): void`, `getExcerptsForFiles(files: TFile[], settings: RelatedNotesSettings): Promise<Map<string, string>>`. `RelatedNotesSettings.noteDisplayMode/excerptLength/excerptUnit/excerptIncludeHeading` (Task 1).
- Produces: `RelatedNotesView.clearExcerptCache(): void` (called from `main.ts`).

- [ ] **Step 1: Add the CSS class constant**

In `src/constants.ts`, add to `CSS_CLASSES` (after `INSTRUCTIONS`):

```typescript
  INSTRUCTIONS: 'related-notes-instructions',
  EXCERPT: 'related-notes-excerpt'
```

- [ ] **Step 2: Add the CSS rule**

In `styles.css`, insert immediately after the existing block:

```css
.related-notes-list-item a:hover {
  color: var(--text-accent);
  text-decoration: underline;
}
```

add:

```css
.related-notes-excerpt {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
  margin-top: 2px;
  cursor: pointer;
}
```

- [ ] **Step 3: Instantiate ExcerptService and add the generation counter**

In `src/view.ts`, add the import:

```typescript
import { ExcerptService } from './excerpt-service';
```

Add class fields (alongside the existing `private uiRenderer: UIRenderer;`):

```typescript
  private excerptService: ExcerptService;
  private renderGeneration = 0;
```

In the constructor (alongside the existing `this.uiRenderer = new UIRenderer();`):

```typescript
    this.excerptService = new ExcerptService(this.app);
```

Add a public method (anywhere in the class body, e.g. directly after `onClose`):

```typescript
  clearExcerptCache(): void {
    this.excerptService.clearCache();
  }
```

- [ ] **Step 4: Update `updateView` to batch-fetch excerpts with a generation guard**

Replace the current `updateView` body:

```typescript
  async updateView() {
    if (!this.plugin.app.workspace.layoutReady) {
      return;
    }

    this.captureCurrentState();
    
    this.container.empty();
    this.container.addClass(CSS_CLASSES.CONTAINER);
    
    const headerEl = this.renderHeader();
    this.renderControls(headerEl);
    
    const activeFile = this.getActiveFile();
    if (!activeFile) return;
    
    const analysisResult = this.tagAnalyzer.analyzeRelatedNotes(activeFile, this.plugin.settings);
    
    if (analysisResult.currentNoteTags.length === 0) {
      this.container.createEl('p', { text: 'Active note has no tags.' });
      return;
    }
    
    if (analysisResult.relatedNotesMap.size === 0) {
      this.container.createEl('p', { text: 'No other notes found with matching tags.' });
      return;
    }
    
    this.renderTagGroups(analysisResult.relatedNotesMap);
    
    this.restoreState();
  }
```

with:

```typescript
  async updateView() {
    if (!this.plugin.app.workspace.layoutReady) {
      return;
    }

    const generation = ++this.renderGeneration;

    this.captureCurrentState();
    
    this.container.empty();
    this.container.addClass(CSS_CLASSES.CONTAINER);
    
    const headerEl = this.renderHeader();
    this.renderControls(headerEl);
    
    const activeFile = this.getActiveFile();
    if (!activeFile) return;
    
    const analysisResult = this.tagAnalyzer.analyzeRelatedNotes(activeFile, this.plugin.settings);
    
    if (analysisResult.currentNoteTags.length === 0) {
      this.container.createEl('p', { text: 'Active note has no tags.' });
      return;
    }
    
    if (analysisResult.relatedNotesMap.size === 0) {
      this.container.createEl('p', { text: 'No other notes found with matching tags.' });
      return;
    }

    const excerpts = await this.getExcerptsIfNeeded(analysisResult.relatedNotesMap);
    if (generation !== this.renderGeneration) return;
    
    this.renderTagGroups(analysisResult.relatedNotesMap, excerpts);
    
    this.restoreState();
  }

  private async getExcerptsIfNeeded(relatedNotesMap: Map<string, FileWithMatchedTags[]>): Promise<Map<string, string>> {
    if (this.plugin.settings.noteDisplayMode === 'title') {
      return new Map<string, string>();
    }

    const allFiles: TFile[] = [];
    relatedNotesMap.forEach(files => {
      files.forEach(f => allFiles.push(f.file));
    });

    return this.excerptService.getExcerptsForFiles(allFiles, this.plugin.settings);
  }
```

- [ ] **Step 5: Thread excerpts through the render methods**

Replace `renderTagGroups`:

```typescript
  private renderTagGroups(relatedNotesMap: Map<string, FileWithMatchedTags[]>): void {
```

with:

```typescript
  private renderTagGroups(relatedNotesMap: Map<string, FileWithMatchedTags[]>, excerpts: Map<string, string>): void {
```

and change its call to `renderFileList` from `this.renderFileList(listEl, sortedFiles);` to `this.renderFileList(listEl, sortedFiles, excerpts);`.

Replace `renderFileList`:

```typescript
  private renderFileList(listEl: HTMLElement, files: FileWithMatchedTags[]): void {
    files.forEach(fileWithTags => {
      const listItemEl = listEl.createEl('li', { cls: CSS_CLASSES.LIST_ITEM });
      const linkEl = this.createFileLink(listItemEl, fileWithTags.file);
      this.setupFileLinkEvents(linkEl, fileWithTags.file);
      
      // Add matched tags if the setting is enabled
      if (this.plugin.settings.showMatchedTags) {
        this.renderMatchedTags(listItemEl, fileWithTags.matchedTags);
      }
    });
  }
```

with:

```typescript
  private renderFileList(listEl: HTMLElement, files: FileWithMatchedTags[], excerpts: Map<string, string>): void {
    files.forEach(fileWithTags => {
      const listItemEl = listEl.createEl('li', { cls: CSS_CLASSES.LIST_ITEM });
      const excerpt = excerpts.get(fileWithTags.file.path) ?? '';
      const { linkEl, excerptEl } = this.createFileLink(listItemEl, fileWithTags.file, excerpt);
      this.setupFileLinkEvents(linkEl, fileWithTags.file);
      if (excerptEl) {
        this.setupFileLinkEvents(excerptEl, fileWithTags.file);
      }
      
      // Add matched tags if the setting is enabled
      if (this.plugin.settings.showMatchedTags) {
        this.renderMatchedTags(listItemEl, fileWithTags.matchedTags);
      }
    });
  }
```

Replace `createFileLink`:

```typescript
  private createFileLink(container: HTMLElement, file: TFile): HTMLElement {
    const linkEl = container.createEl('a', {
      text: file.basename,
      href: '#',
      title: 'Hold Cmd/Ctrl + hover to preview\nClick to open',
      cls: CSS_CLASSES.NOTE_LINK
    });
    linkEl.dataset.filePath = file.path;
    return linkEl;
  }
```

with:

```typescript
  private createFileLink(container: HTMLElement, file: TFile, excerpt: string): { linkEl: HTMLElement; excerptEl?: HTMLElement } {
    const mode = this.plugin.settings.noteDisplayMode;
    const titleText = mode === 'excerpt' && excerpt ? excerpt : file.basename;

    const linkEl = container.createEl('a', {
      text: titleText,
      href: '#',
      title: 'Hold Cmd/Ctrl + hover to preview\nClick to open',
      cls: CSS_CLASSES.NOTE_LINK
    });
    linkEl.dataset.filePath = file.path;

    let excerptEl: HTMLElement | undefined;
    if (mode === 'title-excerpt' && excerpt) {
      excerptEl = container.createDiv({ text: excerpt, cls: CSS_CLASSES.EXCERPT });
    }

    return { linkEl, excerptEl };
  }
```

- [ ] **Step 6: Clear the excerpt cache on settings save**

In `src/main.ts`, replace `saveSettings`:

```typescript
  async saveSettings() {
    await this.saveData(this.settings);
    const view = this.getView();
    if (view) {
      // Trigger a view update if settings change that affect display
      await view.updateView();
    }
  }
```

with:

```typescript
  async saveSettings() {
    await this.saveData(this.settings);
    const view = this.getView();
    if (view) {
      view.clearExcerptCache();
      // Trigger a view update if settings change that affect display
      await view.updateView();
    }
  }
```

- [ ] **Step 7: Verify it compiles**

Run: `npm run lint && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 8: Manually test all three display modes in Obsidian**

Reload the plugin, then in Settings → Related Notes by Tag → Note display:

- **Title** (default): confirm the sidebar looks exactly as it did before this feature — no visual change, no excerpts.
- **Title + excerpt**: confirm each related note shows its title, plus a smaller muted line underneath with the excerpt. Test a note whose first content line is a heading with "Include heading in excerpt" both on and off. Test a note with no body content (frontmatter-only or empty) — it should show no excerpt line rather than a blank one.
- **Excerpt**: confirm the excerpt text replaces the title. For the frontmatter-only/empty note case, confirm it falls back to showing the title instead of a blank list item.
- Try all three excerpt units (Sentences/Words/Characters) with a couple of different length values, including a short length that forces truncation — confirm word-boundary + ellipsis truncation looks right (no text cut mid-word) for words/characters, and that sentence mode never truncates mid-sentence.
- Confirm hovering with Cmd/Ctrl held over the excerpt line (not just the title) triggers the hover preview, and clicking the excerpt line opens the note — same as clicking the title.
- Switch between two notes whose related-notes lists overlap (share at least one common related note) and confirm the panel updates correctly each time with no stale or flickering content.
- With excerpt mode on, type a new tag into the active note character by character and get a general sense of responsiveness — this doesn't need to be scientific, just confirm it doesn't feel noticeably laggier than typing did before this feature.
- Confirm everything unrelated still works: sort/filter/tags-toggle dropdowns, expand/collapse, folder exclusion, matched-tags display.

- [ ] **Step 9: Commit**

```bash
git add src/constants.ts src/view.ts src/main.ts styles.css
git commit -m "$(cat <<'EOF'
Wire excerpt display into the related notes sidebar

updateView() now does one batched, deduplicated excerpt fetch across all
currently-related files before its existing synchronous render, guarded
by a render-generation counter so a superseded async fetch can't paint
stale content over a newer render. Zero added cost when noteDisplayMode
is 'title' (the default) - no fetch happens at all. The excerpt element
shares click-to-open and Cmd/Ctrl-hover-to-preview behaviour with the
title link. Settings save now clears the excerpt cache, since a changed
length/unit/heading-toggle invalidates every cached excerpt at once.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Changelog, version bump, final verification

**Files:**
- Modify: `CHANGELOG.md`, `package.json`, `manifest.json`, `versions.json`

**Interfaces:** None — this task adds no code interfaces.

- [ ] **Step 1: Add the changelog entry**

In `CHANGELOG.md`, add above the current top entry:

```markdown
## [0.6.0]

### Added
- Note excerpt display: show a configurable excerpt of a related note's body text instead of, or alongside, its title. Useful for Zettelkasten/atomic-note vaults where titles are generic dates or IDs. Configurable in settings under "Zettelkasten/Atomic notes": display mode (Title / Title + excerpt / Excerpt), excerpt length in sentences, words, or characters, and whether a leading heading is included in the excerpt.
```

- [ ] **Step 2: Bump the version**

This is a minor bump (0.5.0 → 0.6.0), so `npm run update-version` can't be used directly — it only does a patch bump via `npm version patch`. Edit `package.json`'s `"version"` field to `"0.6.0"` directly, then run:

```bash
node version-bump.mjs
```

Expected output ends with `Build completed successfully`. Then verify:

```bash
grep '"version"' package.json manifest.json && tail -3 versions.json
```

Expected: `package.json` and `manifest.json` both show `0.6.0`, and `versions.json` has a new `"0.6.0"` entry.

- [ ] **Step 3: Final lint and build check**

Run: `npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md manifest.json package.json versions.json
git commit -m "$(cat <<'EOF'
Bump to 0.6.0 for the note excerpt display feature

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

**Spec coverage:** Settings model and UI (Task 1) → design's "Settings model"/"Settings UI" sections. Extraction algorithm (Task 2) → "Excerpt extraction rules". Batching/caching/race guard (Task 3) → "Architecture" section, including the typing-performance reasoning (verified manually in Task 3 Step 8, not built as a debounce per the design's explicit "out of scope"). Rendering/CSS (Task 3) → "Rendering & CSS" section, including the shared click/hover behaviour. "Known limitation, accepted" (stale excerpt on a non-active file edited elsewhere) required no task — it's an accepted limitation matching existing plugin behaviour, not a defect to fix.

**Placeholder scan:** No TBD/TODO markers; every step has complete, concrete code or a specific manual-test checklist.

**Type consistency:** `getExcerptsForFiles(files: TFile[], settings: RelatedNotesSettings): Promise<Map<string, string>>` is identical between Task 2's production and Task 3's consumption. `createFileLink`'s new return shape `{ linkEl: HTMLElement; excerptEl?: HTMLElement }` is used consistently in Task 3 Step 5's `renderFileList` update. `clearExcerptCache()` is defined in Task 3 Step 3 and consumed in Task 3 Step 6 within the same task, so no cross-task mismatch risk.
