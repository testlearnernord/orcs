import type {
  Rank,
  Officer,
  WarcallPlan,
  WarcallResolution,
  WorldState
} from '@sim/types';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Highlight } from '@state/cycleDigest';
import type { GameStore } from '@state/store';
import type { GameMode, UIModeState, UIModeStore } from '@state/ui/mode';
import { FreeRoamView } from '@/features/freeRoam/FreeRoamView';
import {
  selectWarcallsByStatus,
  statusOf,
  type Status as WarcallStatus,
  type WarcallWithPhase
} from '@state/selectors/warcalls';
import { FeedView } from '@ui/components/feed';
import { GraveyardPanel } from '@ui/components/graveyard';
import { OfficerCard } from '@ui/components/officerCard';
import { OfficerTooltip } from '@ui/components/officerTooltip';
import {
  buildRelationEdges,
  RelationsOverlay
} from '@ui/overlay/RelationsOverlay';
import type { RelationEdge } from '@ui/overlay/RelationsOverlay';
import { WarcallsDock } from '@ui/components/warcalls/dock';
import { WarcallModal } from '@ui/components/warcalls/modal';
import type {
  WarcallBucket,
  WarcallEntry
} from '@ui/components/warcalls/types';
import { HelpOverlay } from '@ui/components/helpOverlay';
import { Toast } from '@ui/components/toast';
import { CycleSweep } from '@ui/components/cycleSweep';
import { HighlightPortal } from '@ui/components/highlightPortal';
import {
  bindOnce,
  getRegisteredHotkeys,
  initHotkeys,
  registerHotkey
} from '@core/hotkeys';
import { HighlightStore } from '@state/ui/highlights';
import {
  lensMaskForFilters,
  selectVisibleEdges,
  selectVisibleOfficers
} from '@state/selectors/officers';
import {
  UIFilterStore,
  type FilterKey,
  type UIFilters
} from '@state/ui/filters';

const RANK_ORDER: Rank[] = ['König', 'Spieler', 'Captain', 'Späher', 'Grunzer'];
const MAX_COMPLETED_WARCALLS = 8;
const RELATIONS_OVERLAY_ENABLED = true;
const FILTER_DEFINITIONS: { key: FilterKey; label: string }[] = [
  { key: 'loyalToKing', label: 'Loyal zum König' },
  { key: 'rivalsOfKing', label: 'Rivale des Königs' },
  { key: 'friendships', label: 'Freundschaften' },
  { key: 'rivalries', label: 'Rivalitäten' },
  { key: 'bloodoaths', label: 'Blutschwüre aktiv' },
  { key: 'lowBravery', label: 'Niedriger Mut' },
  { key: 'highGreed', label: 'Hohe Gier' },
  { key: 'promotionCandidates', label: 'Aufstiegskandidaten' },
  { key: 'coupRisk', label: 'Putschgefahr' }
];
const SORT_OPTIONS: { value: UIFilters['sortBy']; label: string }[] = [
  { value: 'merit', label: 'Verdienst' },
  { value: 'level', label: 'Level' },
  { value: 'loyalToKing', label: 'Loyalität zum König' },
  { value: 'relations', label: 'Beziehungen aktiv' },
  { value: 'recentChange', label: 'Letzte Warcall-Änderung' },
  { value: 'random', label: 'Zufall' }
];

export class NemesisUI {
  private root: HTMLElement | null = null;
  private appRoot: HTMLDivElement | null = null;
  private ranksEl: HTMLElement | null = null;
  private feedEl: HTMLElement | null = null;
  private warcallsHost: HTMLElement | null = null;
  private modeIndicator: HTMLElement | null = null;
  private warcallButton: HTMLButtonElement | null = null;
  private freeRoamContainer: HTMLDivElement | null = null;
  private freeRoamRoot: Root | null = null;
  private readonly cards = new Map<string, OfficerCard>();
  private readonly rankContainers = new Map<Rank, HTMLElement>();
  private readonly filters = new UIFilterStore();
  private readonly filterButtons = new Map<FilterKey, HTMLButtonElement>();
  private readonly officerIndex = new Map<string, Officer>();
  private readonly feed = new FeedView();
  private graveyard: GraveyardPanel | null = null;
  private relations: RelationsOverlay | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastEdges: RelationEdge[] = [];
  private readonly tooltip: OfficerTooltip;
  private readonly warcallDock: WarcallsDock;
  private readonly warcallModal: WarcallModal;
  private readonly helpOverlay = new HelpOverlay();
  private readonly toast = new Toast();
  private readonly cycleSweep = new CycleSweep();
  private readonly highlights = new HighlightStore();
  private readonly highlightPortal: HighlightPortal;
  private filterBarEl: HTMLElement | null = null;
  private rankListEl: HTMLElement | null = null;
  private sortSelect: HTMLSelectElement | null = null;
  private completedWarcalls: WarcallEntry[] = [];
  private warcallTab: WarcallStatus = 'active';
  private readonly hotkeyHints = new Set<string>();
  private modeState: UIModeState;
  private digestHistoryEl: HTMLElement | null = null;
  private feedBodyEl: HTMLElement | null = null;

  constructor(
    private readonly store: GameStore,
    private readonly modeStore: UIModeStore
  ) {
    const state = store.getState();
    this.modeState = modeStore.getState();
    this.syncOfficerIndex(state.officers);
    this.graveyard = new GraveyardPanel(state.graveyard);

    this.tooltip = new OfficerTooltip({
      resolveName: (id) => this.officerIndex.get(id)?.name,
      onInvite: (officer) =>
        this.toast.show(`${officer.name} fordert Verstärkung an.`),
      onMarkRival: (officer) =>
        this.toast.show(`${officer.name} wurde als Rivale vorgemerkt.`),
      onOpenDetails: (officer) =>
        this.toast.show(
          `Details für ${officer.name} folgen in einem späteren Build.`
        )
    });

    this.warcallDock = new WarcallsDock({
      onOpenDetails: (entry) => this.openWarcall(entry),
      onTabChange: (status) => {
        this.warcallTab = status;
      }
    });

    this.warcallModal = new WarcallModal({
      onClose: () => document.body.classList.remove('modal-open'),
      onJoin: () =>
        this.toast.show('Kommando: Teilnahme derzeit nur simuliert.'),
      onRedirect: () => this.toast.show('Umlenkung wird protokolliert.'),
      onSabotage: () => this.toast.show('Sabotage ist noch in Arbeit.')
    });
    this.warcallModal.setMode(this.modeState.mode);

    this.highlightPortal = new HighlightPortal({
      onAdvance: () => this.highlights.advance(),
      onSkip: () => this.highlights.clear(),
      onViewLog: () => this.focusDigestHistory()
    });
    this.filters.on('change', () => {
      this.syncFilterControls();
      if (this.ranksEl) {
        this.ranksEl.scrollTop = 0;
      }
      this.renderOfficers(this.store.getState());
    });
    this.highlights.on('change', (state) => {
      this.highlightPortal.update(state.showing);
      this.renderDigestHistory(state.history);
    });
    this.renderDigestHistory(this.highlights.getState().history);

    this.modeStore.on('mode:changed', (next) => this.handleModeChange(next));
    this.syncModeUI();

    store.events.on('feed:appended', (entries) => {
      this.feed.render(entries);
      this.renderFeed();
    });
    store.events.on('graveyard:changed', (officers) => {
      this.graveyard = new GraveyardPanel(officers);
      this.updateGraveyardButton();
    });
    store.events.on('state:changed', (next) => {
      this.syncOfficerIndex(next.officers);
      this.renderOfficers(next);
      this.updateWarcalls(next.warcalls, next.cycle);
    });
    store.events.on('cycle:completed', (summary) => {
      this.cycleSweep.play(summary);
      this.highlightHierarchyChanges(summary.promotions);
      if (summary.feed.length > 0) {
        this.feed.render(summary.feed);
        this.renderFeed();
      }
    });
    store.events.on('cycle:digest', ({ cycle, highlights }) => {
      this.highlights.enqueue(cycle, highlights);
    });
    store.events.on('warcall:planned', () => {
      const state = this.store.getState();
      this.updateWarcalls(state.warcalls, state.cycle);
      this.toast.show('Neuer Warcall eingetragen.');
    });
    store.events.on('warcall:resolved', (resolution) => {
      this.onWarcallResolved(resolution);
    });
  }

  private handleModeChange(state: UIModeState): void {
    this.modeState = state;
    this.syncModeUI();
    this.updateModeUrl(state.mode);
  }

  private updateModeUrl(mode: GameMode): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', next);
  }

  private syncModeUI(): void {
    this.applyModeToControls();
    this.syncModeIndicator();
    this.syncModeAttributes();
    this.syncModeLayout();
    this.warcallModal.setMode(this.modeState.mode);
  }

  private applyModeToControls(): void {
    if (!this.warcallButton) return;
    const disabled = this.modeState.mode !== 'player';
    this.warcallButton.disabled = disabled;
    if (disabled) {
      const reason =
        this.modeState.mode === 'freeRoam'
          ? 'Im Free-Roam-Modus nicht verfügbar.'
          : 'Im Spectate-Mode nicht verfügbar.';
      this.warcallButton.setAttribute('title', reason);
    } else {
      this.warcallButton.removeAttribute('title');
    }
  }

  private syncModeIndicator(): void {
    if (!this.modeIndicator) return;
    let label = 'Spectate-Modus';
    if (this.modeState.mode === 'player') {
      label = 'Player-Modus (Beta)';
    } else if (this.modeState.mode === 'freeRoam') {
      label = 'Free Roam (Test)';
    }
    this.modeIndicator.textContent = label;
  }

  private syncModeAttributes(): void {
    if (this.root) {
      this.root.dataset.mode = this.modeState.mode;
    }
    if (typeof document !== 'undefined' && document.body) {
      document.body.dataset.gameMode = this.modeState.mode;
    }
  }

  private syncModeLayout(): void {
    const isFreeRoam = this.modeState.mode === 'freeRoam';
    if (this.appRoot) {
      if (isFreeRoam) {
        this.appRoot.setAttribute('hidden', 'true');
        this.appRoot.setAttribute('aria-hidden', 'true');
      } else {
        this.appRoot.removeAttribute('hidden');
        this.appRoot.removeAttribute('aria-hidden');
      }
    }
    if (isFreeRoam) {
      this.openFreeRoam();
    } else {
      this.closeFreeRoam();
    }
  }

  private openFreeRoam(): void {
    if (!this.freeRoamContainer) return;
    if (!this.freeRoamRoot) {
      this.freeRoamRoot = createRoot(this.freeRoamContainer);
    }
    this.freeRoamContainer.hidden = false;
    this.freeRoamContainer.removeAttribute('aria-hidden');
    this.freeRoamRoot.render(
      createElement(FreeRoamView, {
        store: this.store,
        modeStore: this.modeStore
      })
    );
  }

  private closeFreeRoam(): void {
    if (this.freeRoamContainer) {
      this.freeRoamContainer.hidden = true;
      this.freeRoamContainer.setAttribute('aria-hidden', 'true');
    }
    if (this.freeRoamRoot) {
      this.freeRoamRoot.unmount();
      this.freeRoamRoot = null;
    }
  }

  mount(root: HTMLElement): void {
    this.root = root;
    root.innerHTML = '';
    root.classList.add('nemesis-root');
    const app = document.createElement('div');
    app.className = 'nemesis-app';
    app.innerHTML = `
      <header class="hud">
        <div class="brand">NEMESIS HOF</div>
        <div class="hud-mode" data-mode-indicator>Spectate-Modus</div>
        <div class="hud-controls">
          <button data-action="cycle">E — Cycle</button>
          <button data-action="reset">R — Neu</button>
          <button data-action="warcall">N — Warcall</button>
          <button data-action="help">Hilfe</button>
          <button data-action="grave">Friedhof (0)</button>
        </div>
      </header>
      <main class="layout">
        <aside class="dock" id="warcalls"></aside>
        <section class="ranks" id="ranks"></section>
        <aside class="feed" id="feed"></aside>
      </main>
    `;
    this.appRoot = app;
    root.appendChild(app);
    this.freeRoamContainer = document.createElement('div');
    this.freeRoamContainer.className = 'free-roam-shell';
    this.freeRoamContainer.hidden = true;
    this.freeRoamContainer.setAttribute('aria-hidden', 'true');
    root.appendChild(this.freeRoamContainer);
    this.highlightPortal.attach(document.body);

    this.ranksEl = app.querySelector('#ranks');
    if (this.ranksEl) {
      this.prepareRankView();
    }
    this.feedEl = app.querySelector('#feed');
    this.warcallsHost = app.querySelector('#warcalls');
    this.modeIndicator = app.querySelector('[data-mode-indicator]');

    if (this.feedEl) {
      this.feedEl.innerHTML = '';
      this.digestHistoryEl = document.createElement('div');
      this.digestHistoryEl.className = 'digest-history';
      this.feedBodyEl = document.createElement('div');
      this.feedBodyEl.className = 'feed-body';
      this.feedEl.append(this.digestHistoryEl, this.feedBodyEl);
      this.renderDigestHistory(this.highlights.getState().history);
    }

    this.warcallsHost?.appendChild(this.warcallDock.element);
    this.registerUIEvents(app);
    this.syncModeUI();

    if (RELATIONS_OVERLAY_ENABLED && this.ranksEl) {
      this.relations = new RelationsOverlay({
        host: this.ranksEl,
        getOfficerElement: (id) => this.cards.get(id)?.element,
        getOfficerData: (id) => this.officerIndex.get(id)
      });
      this.relations.setLensMask(lensMaskForFilters(this.filters.getState()));
      this.resizeObserver = new ResizeObserver(() => {
        this.relations?.refresh();
      });
      this.resizeObserver.observe(this.ranksEl);
      this.ranksEl.addEventListener('scroll', () => {
        this.relations?.refresh();
      });
    }

    const initialState = this.store.getState();
    this.renderOfficers(initialState);
    this.renderFeed();
    this.updateWarcalls(initialState.warcalls, initialState.cycle);
    this.updateGraveyardButton();

    initHotkeys();
    this.registerHotkeys();
  }

  private prepareRankView(): void {
    if (!this.ranksEl) return;
    this.ranksEl.innerHTML = '';
    this.filterButtons.clear();
    this.rankContainers.clear();

    const bar = document.createElement('div');
    bar.className = 'filters-bar';
    const pillContainer = document.createElement('div');
    pillContainer.className = 'filters-bar__pills';
    FILTER_DEFINITIONS.forEach(({ key, label }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'filter-pill';
      button.textContent = label;
      button.addEventListener('click', () => this.toggleFilter(key));
      button.setAttribute('aria-pressed', 'false');
      pillContainer.appendChild(button);
      this.filterButtons.set(key, button);
    });
    bar.appendChild(pillContainer);

    const sortWrapper = document.createElement('div');
    sortWrapper.className = 'filters-bar__sort';
    const sortLabel = document.createElement('span');
    sortLabel.className = 'filters-bar__sort-label';
    sortLabel.textContent = 'Sortieren nach';
    const select = document.createElement('select');
    select.className = 'filters-bar__select';
    select.setAttribute('aria-label', 'Sortieren nach');
    SORT_OPTIONS.forEach(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
    select.addEventListener('change', () =>
      this.handleSortChange(select.value as UIFilters['sortBy'])
    );
    sortWrapper.append(sortLabel, select);
    bar.appendChild(sortWrapper);

    this.filterBarEl = bar;
    this.sortSelect = select;
    this.ranksEl.appendChild(bar);

    this.rankListEl = document.createElement('div');
    this.rankListEl.className = 'rank-list';
    this.ranksEl.appendChild(this.rankListEl);

    this.initializeRankContainers();
    this.syncFilterControls();
  }

  private initializeRankContainers(): void {
    const rankList = this.rankListEl;
    if (!rankList) return;
    rankList.innerHTML = '';
    this.rankContainers.clear();
    RANK_ORDER.forEach((rank) => {
      const container = document.createElement('div');
      container.className = 'rank-group is-empty';
      container.dataset.rank = rank;
      container.innerHTML = `<h3>${rank}</h3><div class="rank-grid"></div>`;
      rankList.appendChild(container);
      this.rankContainers.set(rank, container);
    });
  }

  private syncFilterControls(): void {
    if (this.filterButtons.size === 0 && !this.sortSelect) return;
    const state = this.filters.getState();
    this.filterButtons.forEach((button, key) => {
      const active = Boolean(state[key]);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (this.sortSelect) {
      this.sortSelect.value = state.sortBy;
    }
    if (this.filterBarEl) {
      const hasActive = FILTER_DEFINITIONS.some(({ key }) =>
        Boolean(state[key])
      );
      this.filterBarEl.classList.toggle('has-active', hasActive);
    }
  }

  private toggleFilter(key: FilterKey): void {
    this.filters.toggle(key);
  }

  private handleSortChange(sortBy: UIFilters['sortBy']): void {
    this.filters.setSort(sortBy);
  }

  private registerUIEvents(app: HTMLElement): void {
    app
      .querySelector<HTMLButtonElement>('button[data-action="cycle"]')
      ?.addEventListener('click', () => this.triggerCycle());
    app
      .querySelector<HTMLButtonElement>('button[data-action="reset"]')
      ?.addEventListener('click', () => this.reset());
    this.warcallButton = app.querySelector<HTMLButtonElement>(
      'button[data-action="warcall"]'
    );
    this.warcallButton?.addEventListener('click', () => this.scheduleWarcall());
    app
      .querySelector<HTMLButtonElement>('button[data-action="help"]')
      ?.addEventListener('click', () => this.helpOverlay.toggle());
    app
      .querySelector<HTMLButtonElement>('button[data-action="grave"]')
      ?.addEventListener('click', () =>
        this.toast.show('Graveyard-Overlay ist in Arbeit.')
      );
  }

  private registerHotkeys(): void {
    registerHotkey('e', () => this.triggerCycle());
    registerHotkey('r', () => this.reset());
    registerHotkey('n', () => this.scheduleWarcall());
    registerHotkey('h', () => this.helpOverlay.toggle());
    if (RELATIONS_OVERLAY_ENABLED) {
      registerHotkey('f', () => {
        if (!this.relations) return;
        const next = !this.relations.isLensEnabled();
        this.relations.setLensEnabled(next);
        this.toast.show(
          next ? 'Beziehungs-Lens aktiviert.' : 'Beziehungs-Lens deaktiviert.'
        );
      });
      registerHotkey('l', () => {
        if (!this.relations) return;
        const next = !this.relations.isLegendVisible();
        this.relations.setLegendVisible(next);
        this.toast.show(
          next
            ? 'Relations-Legende eingeblendet.'
            : 'Relations-Legende ausgeblendet.'
        );
      });
    }
    bindOnce('?', () => {
      const registered = getRegisteredHotkeys()
        .map((entry) => entry.key.toUpperCase())
        .join(', ');
      this.toast.show(`Aktive Hotkeys: ${registered}`);
    });
  }

  private triggerCycle(): void {
    this.store.tick();
    this.rememberHint('e', 'Cycle ausgelöst (Hotkey E).');
  }

  private reset(): void {
    this.rememberHint('r', 'Soft-Reset ausgeführt.');
    location.reload();
  }

  private scheduleWarcall(): void {
    if (this.modeState.mode !== 'player') {
      const message =
        this.modeState.mode === 'freeRoam'
          ? 'Im Free-Roam-Modus nicht verfügbar.'
          : 'Im Spectate-Mode nicht verfügbar.';
      this.rememberHint('n-disabled', message);
      return;
    }
    this.store.scheduleWarcall();
    this.rememberHint('n', 'Neuer Warcall (Hotkey N).');
  }

  private rememberHint(key: string, message: string): void {
    if (this.hotkeyHints.has(key)) return;
    this.hotkeyHints.add(key);
    this.toast.show(message);
  }

  private resolveWarcallParticipants(
    ids: string[],
    state: WorldState
  ): Officer[] {
    return ids
      .map(
        (id) =>
          this.officerIndex.get(id) ??
          state.graveyard.find((officer) => officer.id === id)
      )
      .filter((officer): officer is Officer => Boolean(officer));
  }

  private mapWarcallEntry(
    warcall: WarcallWithPhase,
    state: WorldState,
    currentCycle: number
  ): WarcallEntry {
    const participants = this.resolveWarcallParticipants(
      warcall.participants,
      state
    );
    return {
      plan: warcall,
      participants,
      currentCycle,
      phase: warcall.phase,
      status: statusOf(warcall)
    };
  }

  private syncOfficerIndex(officers: Officer[]): void {
    officers.forEach((officer) => this.officerIndex.set(officer.id, officer));
  }

  private renderOfficers(state: WorldState): void {
    const rankList = this.rankListEl;
    if (!rankList) return;
    const filters = this.filters.getState();
    const visible = selectVisibleOfficers(state, filters);
    const visibleIds = new Set(visible.map((officer) => officer.id));

    this.cards.forEach((card, id) => {
      if (!visibleIds.has(id)) {
        card.element.remove();
        this.cards.delete(id);
      }
    });

    RANK_ORDER.forEach((rank) => {
      let container = this.rankContainers.get(rank);
      if (!container) {
        container = document.createElement('div');
        container.className = 'rank-group is-empty';
        container.dataset.rank = rank;
        container.innerHTML = `<h3>${rank}</h3><div class="rank-grid"></div>`;
        rankList.appendChild(container);
        this.rankContainers.set(rank, container);
      }
      if (!container) return;
      const grid = container.querySelector('.rank-grid') as HTMLElement | null;
      if (!grid) return;
      const members = visible.filter((officer) => officer.rank === rank);
      members.forEach((officer) => {
        const existing = this.cards.get(officer.id);
        if (existing) {
          existing.captureBounds();
          existing.update(officer);
          grid.appendChild(existing.element);
          existing.playFlip();
        } else {
          const card = new OfficerCard(officer, {
            tooltip: this.tooltip,
            onOpenDetails: () =>
              this.toast.show(
                `Details für ${officer.name} werden zukünftig erweitert.`
              )
          });
          this.cards.set(officer.id, card);
          grid.appendChild(card.element);
        }
      });
      container.classList.toggle('is-empty', members.length === 0);
    });

    if (this.relations) {
      const allEdges = buildRelationEdges(state.officers, state.cycle);
      this.lastEdges = allEdges;
      const maskedEdges = selectVisibleEdges(visible, allEdges, filters);
      this.relations.setLensMask(lensMaskForFilters(filters));
      this.relations.setEdges(maskedEdges, state.cycle);
    }
  }

  private renderDigestHistory(history: Highlight[][]): void {
    if (!this.digestHistoryEl) return;
    if (history.length === 0) {
      this.digestHistoryEl.innerHTML =
        '<p class="digest-history__empty">Noch keine Highlights.</p>';
      return;
    }
    const items = history.slice(0, 6).map((entries) => {
      const [first] = entries;
      const cycle = first?.cycle ?? 0;
      const count = entries.length;
      const summary = first?.title ?? 'Keine Highlights';
      const subtitle = count === 1 ? '1 Highlight' : `${count} Highlights`;
      return `
        <article class="digest-history__item">
          <header>
            <span class="digest-history__cycle">Zyklus ${cycle}</span>
            <span class="digest-history__count">${subtitle}</span>
          </header>
          <p class="digest-history__title">${summary}</p>
        </article>
      `;
    });
    this.digestHistoryEl.innerHTML = items.join('');
  }

  private focusDigestHistory(): void {
    if (!this.feedEl || !this.digestHistoryEl) return;
    this.feedEl.scrollTo({ top: 0, behavior: 'smooth' });
    this.digestHistoryEl.classList.add('is-highlighted');
    window.setTimeout(() => {
      this.digestHistoryEl?.classList.remove('is-highlighted');
    }, 600);
  }

  private renderFeed(): void {
    if (!this.feedBodyEl) return;
    const lines = this.feed.getLines();
    if (lines.length === 0) {
      this.feedBodyEl.innerHTML =
        '<p class="feed-empty">Noch keine Ereignisse.</p>';
    } else {
      this.feedBodyEl.innerHTML = lines
        .map((line) => `<div class="feed-item">${line.text}</div>`)
        .join('');
    }
    if (this.feedEl) {
      this.feedEl.scrollTop = this.feedEl.scrollHeight;
    }
  }

  private updateGraveyardButton(): void {
    if (!this.root) return;
    const btn = this.root.querySelector<HTMLButtonElement>(
      'button[data-action="grave"]'
    );
    if (!btn) return;
    btn.textContent = `Friedhof (${this.graveyard ? this.graveyard.size : 0})`;
  }

  private updateWarcalls(plans: WarcallPlan[], currentCycle: number): void {
    const state = this.store.getState();
    const viewState: WorldState = { ...state, warcalls: plans };
    const activePlans = selectWarcallsByStatus(viewState, 'active');
    const pendingPlans = selectWarcallsByStatus(viewState, 'pending');

    const active = activePlans.map((plan) =>
      this.mapWarcallEntry(plan, state, currentCycle)
    );
    const pending = pendingPlans.map((plan) =>
      this.mapWarcallEntry(plan, state, currentCycle)
    );

    const buckets: WarcallBucket[] = [
      { label: 'Aktiv', status: 'active', entries: active },
      { label: 'Ausstehend', status: 'pending', entries: pending },
      {
        label: 'Abgeschlossen',
        status: 'done',
        entries: this.completedWarcalls
      }
    ];
    this.warcallDock.update(buckets, this.warcallTab);
  }

  private onWarcallResolved(resolution: WarcallResolution): void {
    const state = this.store.getState();
    const participants = this.resolveWarcallParticipants(
      resolution.warcall.participants,
      state
    );
    const entry: WarcallEntry = {
      plan: { ...resolution.warcall },
      participants,
      currentCycle: state.cycle,
      resolution,
      phase: 'resolution',
      status: 'done'
    };
    this.completedWarcalls = [entry, ...this.completedWarcalls].slice(
      0,
      MAX_COMPLETED_WARCALLS
    );
    this.updateWarcalls(state.warcalls, state.cycle);
  }

  private highlightHierarchyChanges(
    promotions: { officerId: string; from: Rank; to: Rank }[]
  ): void {
    promotions.forEach((promotion) => {
      const card = this.cards.get(promotion.officerId);
      if (!card) return;
      card.element.classList.add('rank-changed');
      setTimeout(() => card.element.classList.remove('rank-changed'), 600);
    });
  }

  private openWarcall(entry: WarcallEntry): void {
    document.body.classList.add('modal-open');
    this.warcallModal.open(entry);
  }
}
