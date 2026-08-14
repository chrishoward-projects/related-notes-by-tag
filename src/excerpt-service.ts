import { App, TFile } from 'obsidian';
import { RelatedNotesSettings } from './settings';
import { MtimeCache } from './mtime-cache';

export class ExcerptService {
  private cache = new MtimeCache<string>();

  constructor(private app: App) {}

  clearCache(): void {
    this.cache.clear();
  }

  async getExcerptsForFiles(files: TFile[], settings: RelatedNotesSettings): Promise<Map<string, string>> {
    return this.cache.getMany(files, file => this.buildExcerpt(file, settings));
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

    const blockStripped = lines.slice(startIndex).map(line => this.stripBlockMarkup(line));
    return this.stripInlineMarkup(blockStripped.join(' '));
  }

  private stripBlockMarkup(line: string): string {
    return line
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s{0,3}>\s?/, '')
      .replace(/^\s*[-*+]\s+/, '')
      .replace(/^\s*\d+\.\s+/, '')
      .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/, '');
  }

  private stripInlineMarkup(text: string): string {
    return text
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
      .replace(/\[\[([^\]]*)\]\]/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/(\*\*\*|___)(.*?)\1/g, '$2')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/#[a-zA-Z0-9_/-]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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
