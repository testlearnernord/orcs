import { getPortraitAsset } from '@sim/portraits';
import type {
  FeedEntry,
  Officer,
  Rank,
  RelationshipType,
  WarcallResolution,
  WorldState
} from '@sim/types';
import type { GameStore } from '@state/store';
import { FeedView } from '@ui/components/feed';
import { GraveyardPanel } from '@ui/components/graveyard';
import { HotkeyBar } from '@ui/components/hotkeys';
import { OfficerToken } from '@ui/components/officerToken';
import { TooltipBreakdown } from '@ui/components/tooltip';

const RANK_ORDER: Rank[] = ['König', 'Spieler', 'Captain', 'Späher', 'Grunzer'];

const RELATION_LABEL: Record<RelationshipType, string> = {
  ALLY: 'Allianz',
  RIVAL: 'Rivale',
  BLOOD_OATH: 'Blutpakt',
  FRIEND: 'Freund'
};

const RELATION_CLASS: Record<RelationshipType, string> = {
  ALLY: 'relation--ally',
  RIVAL: 'relation--rival',
  BLOOD_OATH: 'relation--blood-oath',
  FRIEND: 'relation--friend'
};

const FEED_TONE_CLASS: Record<FeedEntry['tone'], string> = {
  DEATH: 'feed-item--death',
  SPAWN: 'feed-item--spawn',
  PROMOTION: 'feed-item--promotion',
  WARCALL: 'feed-item--warcall',
  RELATIONSHIP: 'feed-item--relationship',
  GENERAL: 'feed-item--general'
};

function hasDom(): boolean {
  return typeof document !== 'undefined';
}

function sanitizeClass(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-');
}

export class NemesisUI {
  readonly feed = new FeedView();
  readonly tooltip = new TooltipBreakdown();
  readonly hotkeys = new HotkeyBar();
  graveyard: GraveyardPanel | null = null;

  private readonly tokens = new Map<string, OfficerToken>();
  private currentState: WorldState | null = null;
  private cycleLabel: HTMLElement | null = null;
  private kingNameLabel: HTMLElement | null = null;
  private kingStatusBadge: HTMLElement | null = null;
  private readonly officerContainers: Record<Rank, HTMLElement | null> = {
    König: null,
    Spieler: null,
    Captain: null,
    Späher: null,
    Grunzer: null
  };
  private feedElement: HTMLElement | null = null;
  private tooltipElement: HTMLElement | null = null;
  private hotkeyContainer: HTMLElement | null = null;
  private readonly hotkeyButtons = new Map<string, HTMLButtonElement>();
  private graveyardOverlay: HTMLElement | null = null;
  private graveyardList: HTMLElement | null = null;
  private graveyardVisible = false;
  private tooltipTimer: number | null = null;

  constructor(private readonly store: GameStore) {
    this.currentState = store.getState();
    this.syncOfficers(this.currentState.officers);
    this.graveyard = new GraveyardPanel(this.currentState.graveyard);
    this.hotkeys.onChanged = () => this.renderHotkeys();

    if (hasDom()) {
      this.mountDom();
      this.renderFullState(this.currentState);
      this.bindHotkeys();
    }

    store.events.on('feed:appended', (entries) => {
      this.feed.render(entries);
    });

    store.events.on('graveyard:changed', (officers) => {
      this.graveyard = new GraveyardPanel(officers);
      if (this.graveyardVisible) {
        this.graveyard.open();
      }
      if (hasDom()) {
        this.renderGraveyard();
      }
    });

    store.events.on('state:changed', (state) => {
      this.currentState = state;
      this.syncOfficers(state.officers);
      if (hasDom()) {
        this.updateHeader(state);
        this.renderOfficerSections();
        this.renderFeedHistory(state.feed);
      }
    });

    store.events.on('cycle:completed', (summary) => {
      const resolution = summary.warcallsResolved.at(-1);
      if (resolution) {
        this.showWarcall(resolution);
      }
    });
  }

  private mountDom(): void {
    if (!hasDom()) return;
    const host = document.getElementById('app');
    if (!host) return;
    host.innerHTML = '';

    const root = document.createElement('div');
    root.className = 'nemesis-app';
    host.appendChild(root);

    const header = document.createElement('header');
    header.className = 'nemesis-header';

    const title = document.createElement('h1');
    title.className = 'nemesis-title';
    title.textContent = 'Nemesis Hof';
    header.appendChild(title);

    const status = document.createElement('div');
    status.className = 'nemesis-status';

    const cycleWrapper = document.createElement('span');
    cycleWrapper.className = 'nemesis-status__item';
    cycleWrapper.textContent = 'Zyklus ';
    const cycleValue = document.createElement('strong');
    cycleValue.className = 'nemesis-status__value';
    cycleWrapper.appendChild(cycleValue);
    this.cycleLabel = cycleValue;
    status.appendChild(cycleWrapper);

    const kingWrapper = document.createElement('span');
    kingWrapper.className = 'nemesis-status__item';
    kingWrapper.textContent = 'König: ';
    const kingName = document.createElement('strong');
    kingName.className = 'nemesis-status__value';
    kingWrapper.appendChild(kingName);
    this.kingNameLabel = kingName;
    status.appendChild(kingWrapper);

    const kingBadge = document.createElement('span');
    kingBadge.className = 'king-badge';
    status.appendChild(kingBadge);
    this.kingStatusBadge = kingBadge;

    header.appendChild(status);

    const graveyardButton = document.createElement('button');
    graveyardButton.type = 'button';
    graveyardButton.className = 'graveyard-toggle';
    graveyardButton.textContent = 'Friedhof';
    graveyardButton.addEventListener('click', () => this.toggleGraveyard());
    header.appendChild(graveyardButton);

    root.appendChild(header);

    const layout = document.createElement('div');
    layout.className = 'nemesis-layout';
    root.appendChild(layout);

    const ranksContainer = document.createElement('main');
    ranksContainer.className = 'nemesis-ranks';
    layout.appendChild(ranksContainer);

    RANK_ORDER.forEach((rank) => {
      const section = document.createElement('section');
      section.className = `rank-section rank-section--${sanitizeClass(rank)}`;
      const heading = document.createElement('h2');
      heading.textContent = rank;
      section.appendChild(heading);
      const list = document.createElement('div');
      list.className = 'officer-grid';
      section.appendChild(list);
      ranksContainer.appendChild(section);
      this.officerContainers[rank] = list;
    });

    const sidebar = document.createElement('aside');
    sidebar.className = 'nemesis-sidebar';
    layout.appendChild(sidebar);

    const feedSection = document.createElement('section');
    feedSection.className = 'feed-section';
    const feedTitle = document.createElement('h2');
    feedTitle.textContent = 'Chronik';
    feedSection.appendChild(feedTitle);
    const feedList = document.createElement('ul');
    feedList.className = 'feed-list';
    feedSection.appendChild(feedList);
    sidebar.appendChild(feedSection);
    this.feedElement = feedList;

    const tooltipBox = document.createElement('div');
    tooltipBox.className = 'warcall-tooltip';
    tooltipBox.setAttribute('aria-hidden', 'true');
    sidebar.appendChild(tooltipBox);
    this.tooltipElement = tooltipBox;

    const hotkeySection = document.createElement('section');
    hotkeySection.className = 'hotkey-section';
    const hotkeyTitle = document.createElement('h3');
    hotkeyTitle.textContent = 'Hotkeys';
    hotkeySection.appendChild(hotkeyTitle);
    const hotkeyList = document.createElement('div');
    hotkeyList.className = 'hotkey-buttons';
    hotkeySection.appendChild(hotkeyList);
    sidebar.appendChild(hotkeySection);
    this.hotkeyContainer = hotkeyList;
    this.renderHotkeys();

    const overlay = document.createElement('div');
    overlay.className = 'graveyard-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    const panel = document.createElement('div');
    panel.className = 'graveyard-panel';
    const panelHeader = document.createElement('div');
    panelHeader.className = 'graveyard-panel__header';
    const panelTitle = document.createElement('h3');
    panelTitle.textContent = 'Friedhof';
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'graveyard-panel__close';
    closeButton.textContent = 'Schließen';
    closeButton.addEventListener('click', () => this.toggleGraveyard(false));
    panelHeader.append(panelTitle, closeButton);
    const list = document.createElement('ul');
    list.className = 'graveyard-list';
    list.addEventListener('scroll', () => {
      if (!this.graveyard) return;
      const target = list.scrollTop;
      const delta = target - this.graveyard.scrollOffset;
      if (delta !== 0) {
        this.graveyard.scroll(delta);
      }
    });
    panel.append(panelHeader, list);
    overlay.appendChild(panel);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.toggleGraveyard(false);
      }
    });
    root.appendChild(overlay);
    this.graveyardOverlay = overlay;
    this.graveyardList = list;
  }

  private bindHotkeys(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.code === 'Space' ? 'space' : event.key.toLowerCase();
    if (key === 'escape' && this.graveyardVisible) {
      event.preventDefault();
      this.toggleGraveyard(false);
      return;
    }
    if (key === 'e' || key === 'space' || key === 'r') {
      event.preventDefault();
      this.handleHotkey(key);
    }
  };

  private handleHotkey(key: string): void {
    const normalized = key.toUpperCase();
    if (normalized === 'E' || normalized === 'SPACE') {
      this.store.tick();
    } else if (normalized === 'R') {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  }

  private renderHotkeys(): void {
    if (!this.hotkeyContainer) return;
    this.hotkeyContainer.innerHTML = '';
    this.hotkeyButtons.clear();
    this.hotkeys.buttons.forEach((button) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'hotkey-button';
      element.dataset.key = button.key;
      element.textContent = `${button.key} — ${button.label}`;
      element.disabled = !button.visible;
      element.addEventListener('click', () => this.handleHotkey(button.key));
      this.hotkeyContainer?.appendChild(element);
      this.hotkeyButtons.set(button.key, element);
    });
  }

  private renderFullState(state: WorldState): void {
    this.updateHeader(state);
    this.renderOfficerSections();
    this.renderFeedHistory(state.feed);
    this.renderGraveyard();
  }

  private updateHeader(state: WorldState): void {
    if (!this.cycleLabel || !this.kingStatusBadge || !this.kingNameLabel)
      return;
    this.cycleLabel.textContent = state.cycle.toString();
    const king =
      state.officers.find((officer) => officer.id === state.kingId) ??
      state.graveyard.find((officer) => officer.id === state.kingId);
    this.kingNameLabel.textContent = king ? king.name : 'Unbekannt';
    this.kingStatusBadge.textContent = state.kingStatus;
    this.kingStatusBadge.dataset.state = state.kingStatus;
    if (state.kingStatus === 'UNGEFESTIGT') {
      this.kingStatusBadge.classList.add('king-badge--unstable');
    } else {
      this.kingStatusBadge.classList.remove('king-badge--unstable');
    }
  }

  private syncOfficers(officers: Officer[]): void {
    this.tokens.clear();
    officers.forEach((officer) => {
      this.tokens.set(officer.id, new OfficerToken(officer));
    });
  }

  private renderOfficerSections(): void {
    if (!this.currentState) return;
    const names = this.buildOfficerNameMap();
    const grouped: Record<Rank, Officer[]> = {
      König: [],
      Spieler: [],
      Captain: [],
      Späher: [],
      Grunzer: []
    };
    this.currentState.officers.forEach((officer) => {
      grouped[officer.rank].push(officer);
    });
    (Object.keys(grouped) as Rank[]).forEach((rank) => {
      const container = this.officerContainers[rank];
      if (!container) return;
      container.innerHTML = '';
      grouped[rank]
        .slice()
        .sort((a, b) => b.merit - a.merit)
        .forEach((officer) => {
          const card = this.buildOfficerCard(officer, names);
          container.appendChild(card);
        });
    });
  }

  private buildOfficerCard(
    officer: Officer,
    names: Map<string, string>
  ): HTMLElement {
    const card = document.createElement('article');
    card.className = `officer-card officer-card--${sanitizeClass(officer.rank)}`;
    if (officer.status === 'DEAD') {
      card.classList.add('officer-card--dead');
    }
    if (this.currentState && officer.id === this.currentState.kingId) {
      card.classList.add('officer-card--king');
    }

    const portraitWrapper = document.createElement('div');
    portraitWrapper.className = 'officer-card__portrait';
    const portrait = document.createElement('img');
    portrait.src = getPortraitAsset(officer.portraitSeed);
    portrait.alt = `${officer.name} Portrait`;
    portraitWrapper.appendChild(portrait);
    if (officer.status === 'DEAD') {
      const cross = document.createElement('span');
      cross.className = 'officer-card__status';
      cross.textContent = '✖';
      portraitWrapper.appendChild(cross);
    }
    card.appendChild(portraitWrapper);

    const info = document.createElement('div');
    info.className = 'officer-card__info';

    const name = document.createElement('h3');
    name.textContent = officer.name;
    info.appendChild(name);

    const meta = document.createElement('p');
    meta.className = 'officer-card__meta';
    meta.textContent = `Lvl ${officer.level} • Ruhm ${officer.merit}`;
    info.appendChild(meta);

    const traitRow = document.createElement('div');
    traitRow.className = 'officer-card__traits';
    officer.traits.forEach((trait) => {
      const badge = document.createElement('span');
      badge.className = 'trait-badge';
      badge.textContent = trait;
      traitRow.appendChild(badge);
    });
    info.appendChild(traitRow);

    const personality = document.createElement('div');
    personality.className = 'officer-card__personality';
    const personalityLabels: Array<keyof Officer['personality']> = [
      'gier',
      'tapferkeit',
      'loyalitaet',
      'stolz'
    ];
    personalityLabels.forEach((key) => {
      const meter = document.createElement('div');
      meter.className = 'personality-meter';
      const label = document.createElement('span');
      label.className = 'personality-meter__label';
      label.textContent = key.charAt(0).toUpperCase() + key.slice(1);
      const bar = document.createElement('div');
      bar.className = 'personality-meter__bar';
      const fill = document.createElement('div');
      fill.className = 'personality-meter__fill';
      fill.style.width = `${Math.round(officer.personality[key] * 100)}%`;
      bar.appendChild(fill);
      meter.append(label, bar);
      personality.appendChild(meter);
    });
    info.appendChild(personality);

    if (officer.relationships.length > 0) {
      const relList = document.createElement('ul');
      relList.className = 'officer-card__relations';
      officer.relationships.forEach((relation) => {
        const item = document.createElement('li');
        item.className = `relation ${RELATION_CLASS[relation.type]}`;
        const label = document.createElement('span');
        label.className = 'relation__label';
        label.textContent = RELATION_LABEL[relation.type];
        const target = document.createElement('span');
        target.className = 'relation__target';
        target.textContent = names.get(relation.with) ?? relation.with;
        item.append(label, target);
        relList.appendChild(item);
      });
      info.appendChild(relList);
    }

    if (officer.memories.length > 0) {
      const memories = document.createElement('ul');
      memories.className = 'officer-card__memories';
      officer.memories
        .slice(-4)
        .reverse()
        .forEach((memory) => {
          const item = document.createElement('li');
          item.textContent = `Z${memory.cycle}: ${memory.summary}`;
          memories.appendChild(item);
        });
      info.appendChild(memories);
    }

    card.appendChild(info);
    return card;
  }

  private buildOfficerNameMap(): Map<string, string> {
    const map = new Map<string, string>();
    if (!this.currentState) return map;
    this.currentState.officers.forEach((officer) => {
      map.set(officer.id, officer.name);
    });
    this.currentState.graveyard.forEach((officer) => {
      map.set(officer.id, officer.name);
    });
    return map;
  }

  private renderFeedHistory(entries: FeedEntry[]): void {
    this.feed.render(entries);
    if (!this.feedElement) return;
    this.feedElement.innerHTML = '';
    entries.forEach((entry) => {
      const item = document.createElement('li');
      item.className = `feed-item ${FEED_TONE_CLASS[entry.tone]}`;
      const cycle = document.createElement('span');
      cycle.className = 'feed-item__cycle';
      cycle.textContent = `Z${entry.cycle}`;
      const text = document.createElement('span');
      text.className = 'feed-item__text';
      text.textContent = entry.text;
      item.append(cycle, text);
      this.feedElement?.appendChild(item);
    });
    this.feedElement.scrollTop = this.feedElement.scrollHeight;
  }

  private renderGraveyard(): void {
    if (!this.graveyardList || !this.graveyard) return;
    this.graveyardList.innerHTML = '';
    this.graveyardList.style.maxHeight = `${this.graveyard.viewportHeight}px`;
    this.graveyard.getEntries().forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'graveyard-entry';
      const cycle = document.createElement('span');
      cycle.className = 'graveyard-entry__cycle';
      cycle.textContent = `Z${entry.cycle}`;
      const name = document.createElement('span');
      name.className = 'graveyard-entry__name';
      name.textContent = entry.name;
      item.append(cycle, name);
      this.graveyardList?.appendChild(item);
    });
    if (this.graveyardVisible) {
      this.graveyardList.scrollTop = this.graveyard.scrollOffset;
    }
  }

  private toggleGraveyard(force?: boolean): void {
    if (!this.graveyardOverlay || !this.graveyard) return;
    const nextVisible =
      force ?? !this.graveyardOverlay.classList.contains('is-visible');
    this.graveyardVisible = nextVisible;
    if (nextVisible) {
      this.graveyard.open();
      this.graveyardOverlay.classList.add('is-visible');
      this.graveyardOverlay.setAttribute('aria-hidden', 'false');
      this.renderGraveyard();
    } else {
      this.graveyard.close();
      this.graveyardOverlay.classList.remove('is-visible');
      this.graveyardOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  getToken(id: string): OfficerToken | undefined {
    return this.tokens.get(id);
  }

  showWarcall(resolution: WarcallResolution): void {
    this.tooltip.show(resolution);
    if (!this.tooltipElement) return;
    this.tooltipElement.textContent = this.tooltip.text;
    this.tooltipElement.classList.add('warcall-tooltip--visible');
    this.tooltipElement.setAttribute('aria-hidden', 'false');
    if (typeof window !== 'undefined') {
      if (this.tooltipTimer) {
        window.clearTimeout(this.tooltipTimer);
      }
      this.tooltipTimer = window.setTimeout(() => {
        this.hideTooltip();
      }, 5000);
    }
  }

  hideTooltip(): void {
    this.tooltip.hide();
    if (!this.tooltipElement) return;
    this.tooltipElement.classList.remove('warcall-tooltip--visible');
    this.tooltipElement.setAttribute('aria-hidden', 'true');
  }
}
