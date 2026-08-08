# Plan: Address OBSIDIAN-PLUGIN-REVIEW.md Findings

Source: `OBSIDIAN-PLUGIN-REVIEW.md` (automated Obsidian plugin submission scan, 63 issues flagged).

Every flagged line was cross-checked against the current source before writing this plan. About a third of the findings were already resolved by earlier work in this session — those are listed separately so they aren't re-fixed.

## Already resolved — no action needed

| Flagged issue | Why it's stale |
|---|---|
| `console.log` in folder-suggestions.ts:52,94 | Removed in 0.4.5 ("Remove debug console.log statements from folder suggestions") |
| Raw heading elements, settings.ts:81,106 | Already uses `.setHeading()` at both locations |
| `element.style.position`, folder-suggestions.ts:50 | Already uses a CSS class (`folder-exclusion-setting-control`) with `position: relative` in styles.css |
| Non-6-digit hex color, styles.css:147 | No hex colors exist in styles.css at all now — confirmed via grep |

## Phase 1 — Async correctness (15 spots)

Files: `src/main.ts`, `src/view.ts`, `src/settings.ts`

Two related patterns:
- Floating promises (async calls fired without `await`/`.catch()`/`void`) — main.ts:24,63,118,133; settings.ts:202; view.ts:23,29,35,62,299,301
- Promise returned where a `void`-returning callback is expected — settings.ts:158-161; view.ts:169,175,181

Fix: add the `void` operator to intentionally-unawaited calls (e.g. `void this.activateView()`), `await` where sequencing matters, and wrap the three `DropdownConfig.onItemClick` handlers in view.ts (lines 169, 175, 181) with `void` since they call async handlers from a sync callback signature.

- [x] main.ts — 4 spots
- [x] view.ts — 9 spots
- [x] settings.ts — 2 spots

## Phase 2 — Popout window compatibility (26 spots)

Files: `src/preview-manager.ts`, `src/folder-suggestions.ts`, `src/ui-renderer.ts`, `src/main.ts`, `src/view.ts`

Replace bare `document` → `activeDocument`, `setTimeout`/`clearTimeout` → `activeWindow.setTimeout()`/`activeWindow.clearTimeout()`.

Why it matters: Obsidian lets users pop a tab out into its own OS window (its own `document`/`window` context). Code that hardcodes the global `document` only ever sees the main window — a hover-preview or dropdown-outside-click listener registered that way silently stops working the moment a user detaches a tab. `activeDocument`/`activeWindow` are Obsidian-provided globals that always resolve to whichever window currently has focus.

- [x] preview-manager.ts — `document` usage throughout `setupEventListeners`/`cleanup`/`handleKeyDown`/`showPreview`, plus the `setTimeout` in `renderPreviewContent` (persistent listeners moved to `registerDomEvent`, which also auto-cleans up on `unload()`)
- [x] folder-suggestions.ts — `document.querySelectorAll`/`document.activeElement`/`document.createElement`/`document.addEventListener` in `displayFolderSuggestions`, plus its `setTimeout` (also folded in the Phase 4 `createDiv()` replacement since both applied to the same lines)
- [x] ui-renderer.ts — `document.addEventListener` in constructor/cleanup
- [x] main.ts:40 — `setTimeout` in the `active-leaf-change` handler
- [x] view.ts:293/303 — `setTimeout`/`clearTimeout` in `setupFileLinkEvents`

## Phase 3 — Remove `!important` from styles.css (9 declarations)

- [x] `.related-notes-dropdown-menu` show/hide toggle (`display: none !important` / `.is-visible { display: block !important }`) — this is the exact pattern that caused the Excalidraw hamburger-menu conflict (issue #15). Now that the class is properly scoped (`related-notes-` prefix), `!important` is redundant — dropped it and relied on the `.is-visible` compound selector's specificity (0,2,0 beats the base rule's 0,1,0).
- [x] `.folder-exclusion-delete-btn` block (6 properties) and its `:hover` — overrides Obsidian's own button styling. Raised specificity instead by scoping to `.folder-exclusion-container .folder-exclusion-delete-btn`. **Correction to the original plan:** it proposed `.related-notes-container`, but that's the sidebar *view's* container — the delete button is created by `Setting.addButton()` in the settings tab, inside `folderExclusionContainer` (settings.ts:88). The proposed selector would have matched nothing.
  - Follow-up found during testing: the `:hover` rule's `--background-modifier-error-hover` is *translucent* in several themes (Minimal: `rgba(255,20,20,0.18)`), so the `--text-error` icon read as red-on-red. Switched the hover to the neutral `--background-modifier-hover`, matching what Obsidian's own `clickable-icon` buttons do. `--text-on-accent` was rejected as the fix: it means "text on **accent** background", is defined four different ways in Minimal alone, and has a paired `--text-on-accent-inverted` for light accents — it does not reliably mean white. General rule: `--background-modifier-*` variables are translucent layers, `--color-*` ramp variables are the solid ones.

## Phase 4 — Minor DOM API suggestions (4 spots)

- [x] ui-renderer.ts `createDropdown` (dropdown item) and view.ts `renderTagGroups` (tag group header): `createEl('div', {...})` → `createDiv({...})`
- [x] folder-suggestions.ts:55,60 — `document.createElement('div')` → `createDiv()` (done during Phase 2, same lines as the `activeDocument` work)
- [x] folder-suggestions.ts:67 — drop unnecessary `as HTMLInputElement` assertion (already narrowed by the earlier `instanceof` guard; confirmed with `tsc --noEmit` that the narrowing holds across the closure since `activeElement` is `const`)
- [x] main.ts:78 — drop unnecessary `as RelatedNotesView` assertion (already narrowed by `instanceof`)

## Phase 5 — README fix

- [x] README.md:73 links to `chrishoward/related-notes-by-tag`; the actual remote is `chrishoward-projects/related-notes-by-tag`. One-line fix.

## Phase 6 — Lockfile

No lockfile is committed (`package-lock.json` exists locally but is gitignored as a build artifact, and untracked).

- [ ] Delete local `package-lock.json`
- [ ] Remove `package-lock.json` from `.gitignore`'s "Build artifacts" section (a lockfile isn't a build artifact)
- [ ] Run `pnpm install` to generate `pnpm-lock.yaml`
- [ ] Commit `pnpm-lock.yaml`

## Skip / low priority (not part of this cleanup)

- **`builtin-modules` replacement suggestion** — generic Node.js lint rule against shipping that package in *runtime* code. Here it's a devDependency used only inside `esbuild.config.mjs` to tell esbuild which Node built-ins to exclude from the bundle — standard practice for Obsidian plugins, never shipped in `main.js`. Treating as a false positive.
- **Vault Enumeration / Vault Read disclosures** — not bugs, just the permissions Obsidian will display on the listing page. Inherent to the plugin's purpose (it has to read tags across the vault).
- **Missing GitHub artifact attestation on release assets** — requires moving release creation into a GitHub Actions workflow with `actions/attest-build-provenance`, a bigger process change than the current manual `release.sh`. Separate discussion if wanted.

## Suggested commit sequence

1. Phases 1–3 together (correctness + popout-window compliance + CSS specificity) — the core code-quality fixes
2. Phases 4–5 together (minor DOM API cleanup + README link)
3. Phase 6 alone (lockfile switch touches `.gitignore` and package-manager tracked state)

Each commit followed by the project's standard version bump (`npm run update-version`) and CHANGELOG.md entry per RELEASE.md.
