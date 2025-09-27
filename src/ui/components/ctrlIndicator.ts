import { onCtrlStateChange } from '@core/hotkeys';

export class CtrlIndicator {
  private readonly root: HTMLDivElement;
  private ctrlStateUnsubscribe: (() => void) | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'ctrl-indicator';
    this.root.innerHTML = `
      <div class="ctrl-indicator__icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 10.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm7-1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-7-7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
          <circle cx="8" cy="8" r="1.5"/>
        </svg>
      </div>
      <div class="ctrl-indicator__label">STRG + Hover für Details</div>
    `;
    
    // Initially hidden
    this.root.classList.add('is-hidden');
    
    document.body.appendChild(this.root);

    // Listen for CTRL key state changes
    this.ctrlStateUnsubscribe = onCtrlStateChange((pressed) => {
      if (pressed) {
        this.show();
      } else {
        this.hide();
      }
    });
  }

  private show(): void {
    this.root.classList.remove('is-hidden');
    this.root.classList.add('is-visible');
  }

  private hide(): void {
    this.root.classList.remove('is-visible');
    this.root.classList.add('is-hidden');
  }

  destroy(): void {
    if (this.ctrlStateUnsubscribe) {
      this.ctrlStateUnsubscribe();
      this.ctrlStateUnsubscribe = null;
    }
    this.root.remove();
  }
}