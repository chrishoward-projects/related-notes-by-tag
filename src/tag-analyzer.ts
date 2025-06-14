import { TFile, getAllTags, App } from 'obsidian';
import { RelatedNotesSettings } from './settings';

export interface FileWithMatchedTags {
  file: TFile;
  matchedTags: string[];
}

export interface TagAnalysisResult {
  relatedNotesMap: Map<string, FileWithMatchedTags[]>;
  currentNoteTags: string[];
}

export class TagAnalyzer {
  constructor(private app: App) {}

  analyzeRelatedNotes(activeFile: TFile, settings: RelatedNotesSettings): TagAnalysisResult {
    const fileCache = this.app.metadataCache.getFileCache(activeFile);
    if (!fileCache) {
      return { relatedNotesMap: new Map(), currentNoteTags: [] };
    }

    const currentNoteTags = getAllTags(fileCache);
    if (!currentNoteTags || currentNoteTags.length === 0) {
      return { relatedNotesMap: new Map(), currentNoteTags: [] };
    }

    const filteredCurrentTags = this.getFilteredTags(currentNoteTags, settings.excludedTags);
    const relatedNotesMap = this.findRelatedNotes(activeFile, filteredCurrentTags, settings.defaultFilterMode);

    return {
      relatedNotesMap,
      currentNoteTags: filteredCurrentTags
    };
  }

  private getFilteredTags(tags: string[], excludedTagsString: string): string[] {
    const excludedTags = excludedTagsString
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    return [...new Set(tags)]
      .filter(tag => !excludedTags.includes(tag.toLowerCase()));
  }

  private findRelatedNotes(activeFile: TFile, currentTags: string[], minTagMatches: number): Map<string, FileWithMatchedTags[]> {
    const relatedNotesMap = new Map<string, FileWithMatchedTags[]>();
    const allMarkdownFiles = this.app.vault.getMarkdownFiles();

    for (const file of allMarkdownFiles) {
      if (file.path === activeFile.path) continue;

      const overlappingTags = this.getOverlappingTags(file, currentTags);
      
      if (overlappingTags.length >= minTagMatches) {
        const fileWithTags: FileWithMatchedTags = {
          file,
          matchedTags: overlappingTags
        };
        
        overlappingTags.forEach(tag => {
          if (!relatedNotesMap.has(tag)) {
            relatedNotesMap.set(tag, []);
          }
          relatedNotesMap.get(tag)?.push(fileWithTags);
        });
      }
    }

    return relatedNotesMap;
  }

  private getOverlappingTags(file: TFile, currentTags: string[]): string[] {
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return [];

    const tagsInFile = getAllTags(cache);
    if (!tagsInFile) return [];

    const uniqueTagsInFile = [...new Set(tagsInFile)];
    return currentTags.filter(tag => uniqueTagsInFile.includes(tag));
  }

  sortFiles(files: FileWithMatchedTags[], sortMode: 'name' | 'date' | 'created'): FileWithMatchedTags[] {
    const sortedFiles = [...files];
    
    switch (sortMode) {
      case 'date':
        return sortedFiles.sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
      case 'created':
        return sortedFiles.sort((a, b) => b.file.stat.ctime - a.file.stat.ctime);
      default:
        return sortedFiles.sort((a, b) => a.file.basename.localeCompare(b.file.basename));
    }
  }
}