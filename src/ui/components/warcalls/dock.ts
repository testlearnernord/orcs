import { getPortraitAsset } from '@sim/portraits';
import type { Officer } from '@sim/types';
import type {
  WarcallEntry,
  WarcallBucket
} from '@ui/components/warcalls/types';

export interface WarcallsDockOptions {
  onOpenDetails: (entry: WarcallEntry) => void;
}

export class WarcallsDock {
  readonly element: HTMLElement;
  private readonly tabs: HTMLButtonElement[] = [];
  private readonly lists = new Map<number, HTMLElement>();
  private activeIndex = 0;
  private readonly options: WarcallsDockOptions;

  constructor(options: WarcallsDockOptions) {
    this.options = options;
    this.element = document.createElement('aside');
    this.element.className = 'warcalls-dock';
    this.element.innerHTML = `
      <header>
        <h2>Warcalls</h2>
        <nav class="warcalls-tabs" role="tablist"></nav>
      </header>
      <div class="warcalls-content"></div>
    `;
  }

  private renderTabs(buckets: WarcallBucket[]): void {
    const nav = this.element.querySelector<HTMLDivElement>('.warcalls-tabs');
    if (!nav) return;
    nav.innerHTML = '';
    this.tabs.length = 0;
    buckets.forEach((bucket, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.classList.add('warcalls-tab');
      button.textContent = `${bucket.label} (${bucket.entries.length})`;
      if (index === this.activeIndex) button.classList.add('is-active');
      button.setAttribute(
        'aria-selected',
        index === this.activeIndex ? 'true' : 'false'
      );
      button.addEventListener('click', () => this.activateTab(index));
      this.tabs.push(button);
      nav.appendChild(button);
    });
  }

  private renderLists(buckets: WarcallBucket[]): void {
    const container = this.element.querySelector('.warcalls-content');
    if (!container) return;
    container.innerHTML = '';
    this.lists.clear();
    buckets.forEach((bucket, index) => {
      const list = document.createElement('div');
      list.className = 'warcall-list';
      if (index !== this.activeIndex) list.hidden = true;
      if (bucket.entries.length === 0) {
        list.innerHTML = '<p class="warcall-empty">Keine Einträge.</p>';
      } else {
        bucket.entries.forEach((entry) => {
          list.appendChild(this.renderEntry(entry));
        });
      }
      container.appendChild(list);
      this.lists.set(index, list);
    });
  }

  private renderEntry(entry: WarcallEntry): HTMLElement {
    const item = document.createElement('article');
    item.className = 'warcall-item';
    item.tabIndex = 0;
    const phase = this.resolvePhase(entry);
    const timeRemaining = Math.max(
      0,
      entry.plan.resolveOn - entry.currentCycle
    );
    item.innerHTML = `
      <header>
        <span class="warcall-kind">${entry.plan.kind}</span>
        <span class="warcall-phase">${phase}</span>
      </header>
      <p class="warcall-meta">${entry.plan.location} • Zyklus ${entry.plan.cycleAnnounced}</p>
      <p class="warcall-risk">Risiko ${(entry.plan.risk * 100).toFixed(0)}% • ${
        entry.plan.rewardHint ?? 'Unbekannte Beute'
      }</p>
      <div class="warcall-avatars">${this.renderParticipants(entry.participants)}</div>
      <footer>
        <span class="warcall-timer">Noch ${timeRemaining} Zyklen</span>
        <button type="button">Details</button>
      </footer>
    `;
    const button = item.querySelector('button');
    button?.addEventListener('click', () => this.options.onOpenDetails(entry));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.options.onOpenDetails(entry);
      }
    });
    item.addEventListener('click', () => this.options.onOpenDetails(entry));
    return item;
  }

  private renderParticipants(participants: Officer[]): string {
    return participants
      .map((officer) => {
        const src = getPortraitAsset(officer.portraitSeed);
        return `<span class="warcall-avatar" title="${officer.name}"><img src="${src}" alt="${officer.name}"></span>`;
      })
      .join('');
  }

  private resolvePhase(entry: WarcallEntry): string {
    if (entry.resolution) {
      return entry.resolution.success
        ? 'Abgeschlossen: Triumph'
        : 'Abgeschlossen: Scheitern';
    }
    const remaining = entry.plan.resolveOn - entry.currentCycle;
    if (remaining > 1) return 'Vorbereitung';
    if (remaining === 1) return 'Anreise';
    return 'Ereignis';
  }

  activateTab(index: number): void {
    this.activeIndex = index;
    this.tabs.forEach((tab, idx) => {
      if (!tab) return;
      tab.classList.toggle('is-active', idx === index);
      tab.setAttribute('aria-selected', idx === index ? 'true' : 'false');
    });
    this.lists.forEach((list, idx) => {
      list.hidden = idx !== index;
    });
  }

  update(buckets: WarcallBucket[]): void {
    if (this.activeIndex >= buckets.length) {
      this.activeIndex = 0;
    }
    this.renderTabs(buckets);
    this.renderLists(buckets);
  }
}
