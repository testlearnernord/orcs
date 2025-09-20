export class Toast {
  private readonly root: HTMLDivElement;
  private hideTimer: number | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'ui-toast hidden';
    document.body.appendChild(this.root);
  }

  show(message: string, duration = 2200): void {
    this.root.textContent = message;
    this.root.classList.remove('hidden');
    this.root.classList.add('is-visible');
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
    }
    this.hideTimer = window.setTimeout(() => this.hide(), duration);
  }

  hide(): void {
    this.root.classList.remove('is-visible');
    this.hideTimer = window.setTimeout(() => {
      this.root.classList.add('hidden');
    }, 200);
  }
}
