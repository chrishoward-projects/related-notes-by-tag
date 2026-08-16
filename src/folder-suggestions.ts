import { AbstractInputSuggest, App, TFolder } from 'obsidian';

/** Vault paths are stored absolute, with a leading slash. */
function toStoredPath(folder: TFolder): string {
  return folder.path === '/' ? '/' : `/${folder.path}`;
}

/**
 * Type-ahead over the vault's folders. Obsidian supplies the popover, its
 * positioning and keyboard handling; all that is left is deciding what to
 * offer and what picking one means.
 */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
  constructor(
    app: App,
    private readonly inputEl: HTMLInputElement,
    private readonly onPick: (path: string) => void
  ) {
    super(app, inputEl);
  }

  protected getSuggestions(query: string): TFolder[] {
    const needle = query.toLowerCase();
    return this.app.vault.getAllFolders()
      .filter(folder => toStoredPath(folder).toLowerCase().includes(needle))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  renderSuggestion(folder: TFolder, el: HTMLElement): void {
    el.setText(toStoredPath(folder));
  }

  selectSuggestion(folder: TFolder): void {
    const path = toStoredPath(folder);
    this.setValue(path);
    this.inputEl.value = path;
    this.onPick(path);
    this.close();
  }
}
