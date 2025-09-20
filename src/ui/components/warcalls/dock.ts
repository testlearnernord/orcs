import type { Officer } from '@sim/types';
import type { Status } from '@state/selectors/warcalls';
import type {
  WarcallEntry,
  WarcallBucket
} from '@ui/components/warcalls/types';
import Portrait from '@ui/Portrait';

export interface WarcallsDockOptions {
  onOpenDetails: (entry: WarcallEntry) => void;
  onTabChange?: (status: Status) => void;
}

export class WarcallsDock {
  readonly element: HTMLElement;
  private readonly tabs = new Map<Status, HTMLButtonElement>();
  private readonly lists = new Map<Status, HTMLDivElement>();
  private activeStatus: Status = 'active';
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
    const nav =
      this.element.querySelector<HTMLElementTagNameMap['nav']>(
        'nav.warcalls-tabs'
      );
    if (!nav) return;
    nav.innerHTML = '';
    this.tabs.clear();
    buckets.forEach((bucket) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.classList.add('warcalls-tab');
      button.textContent = `${bucket.label} (${bucket.entries.length})`;
      button.dataset.status = bucket.status;
      if (bucket.status === this.activeStatus)
        button.classList.add('is-active');
      button.setAttribute(
        'aria-selected',
        bucket.status === this.activeStatus ? 'true' : 'false'
      );
      button.addEventListener('click', () => this.activateTab(bucket.status));
      this.tabs.set(bucket.status, button);
      nav.appendChild(button);
    });
  }

  private renderLists(buckets: WarcallBucket[]): void {
    const container =
      this.element.querySelector<HTMLDivElement>('.warcalls-content');
    if (!container) return;
    container.innerHTML = '';
    this.lists.clear();
    buckets.forEach((bucket) => {
      const list = document.createElement('div');
      list.className = 'warcall-list';
      list.dataset.status = bucket.status;
      if (bucket.status !== this.activeStatus) list.hidden = true;
      if (bucket.entries.length === 0) {
        list.innerHTML = '<p class="warcall-empty">Keine Einträge.</p>';
      } else {
        bucket.entries.forEach((entry) => {
          list.appendChild(this.renderEntry(entry));
        });
      }
      container.appendChild(list);
      this.lists.set(bucket.status, list);
    });
  }

  private renderEntry(entry: WarcallEntry): HTMLElement {
    const item = document.createElement('article');
    item.className = 'warcall-item';
    item.tabIndex = 0;
    const phase = this.resolvePhaseLabel(entry);
    const timeRemaining = Math.max(
      0,
      entry.plan.resolveOn - entry.currentCycle
    );
    const rewardHint = entry.plan.rewardHint ?? 'Unbekannte Beute';
    item.innerHTML = `
      <header>
        <span class="warcall-kind">${entry.plan.kind}</span>
        <span class="warcall-phase">${phase}</span>
      </header>
      <p class="warcall-meta">${entry.plan.location} • Zyklus ${entry.plan.cycleAnnounced}</p>
      <p class="warcall-risk">Risiko ${(entry.plan.risk * 100).toFixed(0)}% • ${rewardHint}</p>
      <div class="warcall-avatars"></div>
      <footer>
        <span class="warcall-timer">Noch ${timeRemaining} Zyklen</span>
        <button type="button">Details</button>
      </footer>
    `;
    const avatarContainer =
      item.querySelector<HTMLDivElement>('.warcall-avatars');
    if (avatarContainer) {
      this.renderParticipants(avatarContainer, entry.participants);
    }
    const button = item.querySelector<HTMLButtonElement>('button');
    const handleOpenDetails = () => this.options.onOpenDetails(entry);
    button?.addEventListener('click', handleOpenDetails);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleOpenDetails();
      }
    });
    item.addEventListener('click', handleOpenDetails);
    return item;
  }

  private renderParticipants(
    container: HTMLDivElement,
    participants: readonly Officer[]
  ): void {
    container.innerHTML = '';
    participants.forEach((officer) => {
      const avatar = document.createElement('span');
      avatar.className = 'warcall-avatar';
      avatar.title = officer.name;
      const portrait = new Portrait({
        officer,
        size: 32,
        dead: officer.status === 'DEAD',
        className: 'warcall-avatar__img'
      });
      avatar.appendChild(portrait.element);
      container.appendChild(avatar);
    });
  }

  private resolvePhaseLabel(entry: WarcallEntry): string {
    if (entry.resolution) {
      return entry.resolution.success
        ? 'Abgeschlossen: Triumph'
        : 'Abgeschlossen: Scheitern';
    }
    switch (entry.phase) {
      case 'prep':
        return 'Vorbereitung';
      case 'travel':
        return 'Anreise';
      case 'event':
        return 'Ereignis';
      case 'resolution':
        return 'Auflösung';
      default:
        return entry.phase;
    }
  }

  private syncActiveStatus(emit: boolean): void {
    this.tabs.forEach((tab, status) => {
      const active = status === this.activeStatus;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    this.lists.forEach((list, status) => {
      list.hidden = status !== this.activeStatus;
    });
    if (emit) {
      this.options.onTabChange?.(this.activeStatus);
    }
  }

  activateTab(status: Status): void {
    this.activeStatus = status;
    this.syncActiveStatus(true);
  }

  update(buckets: WarcallBucket[], activeStatus?: Status): void {
    if (activeStatus) {
      this.activeStatus = activeStatus;
    }
    if (!buckets.some((bucket) => bucket.status === this.activeStatus)) {
      this.activeStatus = buckets[0]?.status ?? this.activeStatus;
    }
    this.renderTabs(buckets);
    this.renderLists(buckets);
    this.syncActiveStatus(false);
  }
}
