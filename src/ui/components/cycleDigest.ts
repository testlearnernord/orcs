import type { Highlight } from '@state/cycleDigest';

interface DigestSnapshot {
  cycle: number;
  highlights: Highlight[];
}

export class CycleDigest {
  readonly element: HTMLDivElement;
  private readonly list: HTMLUListElement;
  private readonly title: HTMLSpanElement;
  private readonly historyButton: HTMLButtonElement;
  private readonly historyPanel: HTMLDivElement;
  private readonly historyList: HTMLUListElement;
  private history: DigestSnapshot[] = [];

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'cycle-digest hidden';
    this.element.innerHTML = `
      <div class="cycle-digest__card">
        <header>
          <span class="cycle-digest__title">Zyklus 0</span>
          <button type="button" class="cycle-digest__history">Vorheriger Digest</button>
        </header>
        <div class="cycle-digest__sweep"></div>
        <ul class="cycle-digest__list"></ul>
      </div>
      <div class="cycle-digest__history-panel hidden">
        <h4>Digest-Historie</h4>
        <ul class="cycle-digest__history-list"></ul>
      </div>
    `;
    document.body.appendChild(this.element);
    this.list = this.element.querySelector(
      '.cycle-digest__list'
    ) as HTMLUListElement;
    this.title = this.element.querySelector(
      '.cycle-digest__title'
    ) as HTMLSpanElement;
    this.historyButton = this.element.querySelector(
      '.cycle-digest__history'
    ) as HTMLButtonElement;
    this.historyPanel = this.element.querySelector(
      '.cycle-digest__history-panel'
    ) as HTMLDivElement;
    this.historyList = this.element.querySelector(
      '.cycle-digest__history-list'
    ) as HTMLUListElement;
    this.historyButton.addEventListener('click', () => this.toggleHistory());
  }

  show(cycle: number, highlights: Highlight[]): void {
    this.history = [{ cycle, highlights }, ...this.history].slice(0, 10);
    this.renderCurrent(cycle, highlights);
    this.renderHistory();
    this.triggerSweep();
  }

  private renderCurrent(cycle: number, highlights: Highlight[]): void {
    this.element.classList.remove('hidden');
    this.title.textContent = `Zyklus ${cycle}`;
    this.list.innerHTML = '';
    if (highlights.length === 0) {
      const li = document.createElement('li');
      li.className = 'cycle-digest__empty';
      li.textContent = 'Keine besonderen Ereignisse in diesem Zyklus.';
      this.list.appendChild(li);
    } else {
      highlights.slice(0, 5).forEach((highlight) => {
        const item = document.createElement('li');
        item.className = 'cycle-digest__item';
        item.innerHTML = `
          <span class="cycle-digest__icon">${highlight.icon}</span>
          <div class="cycle-digest__body">
            <strong>${highlight.label}</strong>
            ${highlight.details ? `<span>${highlight.details}</span>` : ''}
          </div>
        `;
        this.list.appendChild(item);
      });
    }
    this.historyButton.disabled = this.history.length <= 1;
    if (this.historyButton.disabled) {
      this.historyPanel.classList.add('hidden');
      this.element.classList.remove('is-history-open');
    }
  }

  private renderHistory(): void {
    const historyEntries = this.history.slice(1);
    this.historyList.innerHTML = '';
    if (historyEntries.length === 0) return;
    historyEntries.forEach((snapshot) => {
      const item = document.createElement('li');
      item.innerHTML = `
        <strong>Zyklus ${snapshot.cycle}</strong>
        <span>${snapshot.highlights
          .slice(0, 3)
          .map((highlight) => highlight.label)
          .join(' • ')}</span>
      `;
      this.historyList.appendChild(item);
    });
  }

  private toggleHistory(): void {
    if (this.historyButton.disabled) return;
    const open = this.element.classList.toggle('is-history-open');
    this.historyPanel.classList.toggle('hidden', !open);
    this.historyButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  private triggerSweep(): void {
    const sweep = this.element.querySelector('.cycle-digest__sweep');
    if (!sweep) return;
    sweep.classList.remove('is-animating');
    // Force reflow to restart animation
    void (sweep as HTMLElement).offsetWidth;
    sweep.classList.add('is-animating');
  }
}
