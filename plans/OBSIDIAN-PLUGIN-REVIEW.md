Review
Caution
63 issues found by automated scans of the latest release.
Passed
3
No known vulnerable dependencies.
No obfuscated code detected.
No network requests detected.
Disclosures
4
Vault Enumeration: Enumerates all files in the vault (vault.getFiles, getMarkdownFiles, etc.) — gives the plugin access to every file path in the vault
Vault Read: Reads individual vault files via the Obsidian API (vault.read, vault.cachedRead)
Malware scan not available.
Build verification not available.
Warnings
60
Use 'activeDocument' instead of 'document' for popout window compatibility.
17
src/folder-suggestions.ts:32
src/folder-suggestions.ts:38
src/folder-suggestions.ts:55
src/folder-suggestions.ts:60
src/folder-suggestions.ts:106
src/folder-suggestions.ts:112
src/preview-manager.ts:16
src/preview-manager.ts:17
src/preview-manager.ts:18
src/preview-manager.ts:22
src/preview-manager.ts:23
src/preview-manager.ts:24
src/preview-manager.ts:37
src/preview-manager.ts:64
src/preview-manager.ts:70
src/ui-renderer.ts:21
src/ui-renderer.ts:245
Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the void operator.
11
src/main.ts:24
src/main.ts:63
src/main.ts:118
src/main.ts:133
src/settings.ts:202
src/view.ts:23
src/view.ts:29
src/view.ts:35
src/view.ts:62
src/view.ts:299
src/view.ts:301
Avoid !important — override styles by increasing selector specificity or using CSS variables instead.
9
styles.css:110
styles.css:116
styles.css:252
styles.css:253
styles.css:254
styles.css:255
styles.css:256
styles.css:257
styles.css:261
Use 'activeWindow.setTimeout()' instead of 'setTimeout()' for popout window compatibility.
4
src/folder-suggestions.ts:111
src/main.ts:40
src/preview-manager.ts:112
src/view.ts:279
Promise returned in function argument where a void return was expected.
4
src/settings.ts:158-161
src/view.ts:169
src/view.ts:175
src/view.ts:181
Avoid unnecessary logging to console.
2
src/folder-suggestions.ts:52
src/folder-suggestions.ts:94
Learn more
Use 'createDiv()' instead of 'document.createElement('div')'.
2
src/folder-suggestions.ts:55
src/folder-suggestions.ts:60
This assertion is unnecessary since it does not change the type of the expression.
2
src/folder-suggestions.ts:67
src/main.ts:78
For a consistent UI use new Setting(containerEl).setName(...).setHeading() instead of creating HTML heading elements directly.
2
src/settings.ts:81
src/settings.ts:106
"builtin-modules" should be replaced with an alternative package. Read more here: https://github.com/es-tooling/module-replacements/blob/main/docs/modules/builtin-modules.md
package.json:29
Avoid setting styles directly via element.style.position. Use CSS classes for better theming and maintainability. Use the setCssProps function if the CSS properties need to change dynamically.
src/folder-suggestions.ts:50
Use 'menu.createDiv({ cls: ${CSS_CLASSES.DROPDOWN_ITEM} ${option.isActive ? CSS_CLASSES.DROPDOWN_ITEM_ACTIVE : ''}, text: option.label })' instead of 'menu.createEl('div', { cls: ${CSS_CLASSES.DROPDOWN_ITEM} ${option.isActive ? CSS_CLASSES.DROPDOWN_ITEM_ACTIVE : ''}, text: option.label })'.
src/ui-renderer.ts:68-71
Use 'tagGroupEl.createDiv({ text: Notes with tag: ${tag} + ' ('+ sortedFiles.length +')', cls: CSS_CLASSES.TAG_GROUP_HEADER })' instead of 'tagGroupEl.createEl('div', { text: Notes with tag: ${tag} + ' ('+ sortedFiles.length +')', cls: CSS_CLASSES.TAG_GROUP_HEADER })'.
src/view.ts:222-225
Use 'activeWindow.clearTimeout()' instead of 'clearTimeout()' for popout window compatibility.
src/view.ts:289
README links to a different repository with the same name: chrishoward/related-notes-by-tag
This usually means the README was not updated after forking or renaming the repository. Update all links to point to your own repository.
Use the full 6-digit hex format for consistency.
styles.css:147
Other
3
2 release assets are missing a GitHub artifact attestation
2
main.js, styles.css
Learn more
No lockfile found (pnpm-lock.yaml, yarn.lock, package-lock.json, or bun.lock). Build verification requires a committed lockfile to ensure reproducible dependency resolution.
Without a lockfile, dependency versions may differ between environments, making it impossible to reproduce builds byte-for-byte.
