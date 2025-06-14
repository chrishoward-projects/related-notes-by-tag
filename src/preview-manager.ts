import { TFile, MarkdownRenderer, App } from 'obsidian';
import { CSS_CLASSES, DIMENSIONS, TIMEOUTS } from './constants';

export class PreviewManager {
  private previewPopup: HTMLElement | null = null;
  private currentPreviewFile: TFile | null = null;
  private isModifierHeld = false;
  private lastMousePosition = { x: 0, y: 0 };

  constructor(private app: App) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('mousemove', this.trackMousePosition);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  cleanup(): void {
    document.removeEventListener('mousemove', this.trackMousePosition);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.hidePreview();
  }

  private trackMousePosition = (e: MouseEvent): void => {
    this.lastMousePosition = { x: e.clientX, y: e.clientY };
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.isModifierHeld = e.metaKey || e.ctrlKey;
    
    if (this.isModifierHeld) {
      const hoveredElement = document.elementFromPoint(
        this.lastMousePosition.x, 
        this.lastMousePosition.y
      );
      const linkEl = hoveredElement?.closest(`.${CSS_CLASSES.NOTE_LINK}`);
      
      if (linkEl instanceof HTMLElement && linkEl.dataset.filePath) {
        const file = this.app.vault.getAbstractFileByPath(linkEl.dataset.filePath);
        if (file instanceof TFile) {
          this.showPreview(file, linkEl);
        }
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.isModifierHeld = e.metaKey || e.ctrlKey;
    if (!this.isModifierHeld && this.previewPopup) {
      this.hidePreview();
    }
  };

  showPreview(file: TFile, linkEl: HTMLElement): void {
    this.hidePreview();
    
    this.previewPopup = document.body.createDiv(CSS_CLASSES.PREVIEW);
    this.currentPreviewFile = file;
    
    const position = this.calculatePosition(linkEl);
    this.applyPopupStyles(position);
    
    document.addEventListener('click', this.hidePreviewOnClick, { once: true });
    
    this.renderPreviewContent(file, linkEl);
  }

  private calculatePosition(linkEl: HTMLElement): { left: number; top: number } {
    const linkRect = linkEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const popupWidth = DIMENSIONS.PREVIEW_POPUP_WIDTH;
    const margin = DIMENSIONS.PREVIEW_POPUP_MARGIN;
    
    let finalLeft: number;
    
    if (linkRect.right + popupWidth + margin <= viewportWidth) {
      finalLeft = linkRect.right + margin;
    } else if (linkRect.left - popupWidth - margin >= 0) {
      finalLeft = linkRect.left - popupWidth - margin;
    } else {
      finalLeft = Math.max(margin, Math.min(
        (viewportWidth - popupWidth) / 2, 
        viewportWidth - popupWidth - margin
      ));
    }
    
    return { left: finalLeft, top: linkRect.top };
  }

  private applyPopupStyles(position: { left: number; top: number }): void {
    if (!this.previewPopup) return;
    
    Object.assign(this.previewPopup.style, {
      position: 'fixed',
      left: `${position.left}px`,
      top: `${position.top}px`,
      zIndex: '9999',
      width: `${DIMENSIONS.PREVIEW_POPUP_WIDTH}px`,
      maxHeight: DIMENSIONS.PREVIEW_MAX_HEIGHT,
      overflowY: 'auto'
    });
  }

  private renderPreviewContent(file: TFile, linkEl: HTMLElement): void {
    setTimeout(() => {
      if (this.previewPopup && this.currentPreviewFile === file && this.isModifierHeld) {
        MarkdownRenderer.render(
          this.app,
          `![[${file.basename}]]`,
          this.previewPopup,
          file.path,
          this as any // Type assertion needed for Obsidian's renderer
        ).then(() => {
          this.previewPopup?.addClass(CSS_CLASSES.PREVIEW_LOADED);
          if (!linkEl.matches(':hover') || !this.isModifierHeld) {
            // Optionally hide preview if no longer hovering
          }
        });
      }
    }, TIMEOUTS.PREVIEW_RENDER_DELAY);
  }

  hidePreview(): void {
    if (this.previewPopup) {
      this.previewPopup.remove();
      this.previewPopup = null;
      this.currentPreviewFile = null;
    }
  }

  private hidePreviewOnClick = (): void => {
    this.hidePreview();
  };

  getIsModifierHeld(): boolean {
    return this.isModifierHeld;
  }
}