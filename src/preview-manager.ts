import { TFile, MarkdownRenderer, App, Component } from 'obsidian';
import { CSS_CLASSES, DIMENSIONS, TIMEOUTS } from './constants';

export class PreviewManager extends Component {
  private previewPopup: HTMLElement | null = null;
  private currentPreviewFile: TFile | null = null;
  private isModifierHeld = false;
  private lastMousePosition = { x: 0, y: 0 };

  constructor(private app: App) {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.registerDomEvent(activeDocument, 'mousemove', this.trackMousePosition);
    this.registerDomEvent(activeDocument, 'keydown', this.handleKeyDown);
    this.registerDomEvent(activeDocument, 'keyup', this.handleKeyUp);
  }

  cleanup(): void {
    this.hidePreview();
    this.unload(); // Properly unload the component; also removes registered DOM events
  }

  private trackMousePosition = (e: MouseEvent): void => {
    this.lastMousePosition = { x: e.clientX, y: e.clientY };
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.isModifierHeld = e.metaKey || e.ctrlKey;
    
    if (this.isModifierHeld) {
      const hoveredElement = activeDocument.elementFromPoint(
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
    if (e.key === 'Meta' || e.key === 'Control') {
      this.isModifierHeld = false;
      if (this.previewPopup) {
        this.hidePreview();
      }
    }
  };

  showPreview(file: TFile, linkEl: HTMLElement): void {
    this.hidePreview();
    
    this.previewPopup = activeDocument.body.createDiv(CSS_CLASSES.PREVIEW);
    this.currentPreviewFile = file;
    
    const position = this.calculatePosition(linkEl);
    this.applyPopupStyles(position);
    
    activeDocument.addEventListener('click', this.hidePreviewOnClick, { once: true });
    
    this.renderPreviewContent(file);
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

    // Only set dynamic position values; static styles are in styles.css
    this.previewPopup.style.left = `${position.left}px`;
    this.previewPopup.style.top = `${position.top}px`;
  }

  private renderPreviewContent(file: TFile): void {
    window.setTimeout(async () => {
      if (this.previewPopup && this.currentPreviewFile === file && this.isModifierHeld) {
        try {
          // Read the file content directly
          const content = await this.app.vault.read(file);

          // Re-check: hidePreview() may have run while the file was being read
          if (!(this.previewPopup && this.currentPreviewFile === file)) {
            return;
          }

          // Use this PreviewManager instance as the component since it extends Component
          await MarkdownRenderer.render(
            this.app,
            content,
            this.previewPopup,
            file.path,
            this
          );
          this.previewPopup?.addClass(CSS_CLASSES.PREVIEW_LOADED);
        } catch (error) {
          console.error('Failed to render preview:', error);
          if (this.previewPopup) {
            this.previewPopup.setText('Failed to load preview');
          }
        }
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