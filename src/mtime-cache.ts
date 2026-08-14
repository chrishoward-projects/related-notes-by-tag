import { TFile } from 'obsidian';

interface CacheEntry<T> {
  mtime: number;
  value: T;
}

/**
 * Caches a value derived from a file's contents, discarding it once the file
 * is modified. Reading and processing a note is far more expensive than the
 * comparison, so anything rebuilt per keystroke belongs behind one of these.
 */
export class MtimeCache<T> {
  private entries: Map<string, CacheEntry<T>> = new Map();

  clear(): void {
    this.entries.clear();
  }

  /**
   * Values for each of the given files, building only those missing or stale.
   * Duplicate files are built once.
   */
  async getMany(files: TFile[], build: (file: TFile) => Promise<T>): Promise<Map<string, T>> {
    const uniqueFiles = new Map<string, TFile>();
    files.forEach(file => uniqueFiles.set(file.path, file));

    const result = new Map<string, T>();
    const misses: TFile[] = [];

    uniqueFiles.forEach(file => {
      const cached = this.entries.get(file.path);
      if (cached && cached.mtime === file.stat.mtime) {
        result.set(file.path, cached.value);
      } else {
        misses.push(file);
      }
    });

    await Promise.all(misses.map(async file => {
      const value = await build(file);
      this.entries.set(file.path, { mtime: file.stat.mtime, value });
      result.set(file.path, value);
    }));

    return result;
  }
}
