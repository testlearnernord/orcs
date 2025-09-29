import type {
  Rank,
  Officer,
  WarcallPlan,
  WarcallResolution,
  WorldState
} from '@sim/types';
import { RANK_QUOTAS } from '@sim/constants';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Highlight } from '@state/cycleDigest';
import type { GameStore } from '@state/store';
import type { GameMode, UIModeState, UIModeStore } from '@state/ui/mode';
import { FreeRoamView } from '@/features/freeRoam/FreeRoamView';
import { bootstrapPlayerMode } from '@/playerMode';
import {
  selectWarcallsByStatus,
  statusOf,
  type Status as WarcallStatus,
  type WarcallWithPhase
} from '@state/selectors/warcalls';
import { FeedView } from '@ui/components/feed';
import { GraveyardPanel } from '@ui/components/graveyard';
import { OfficerCard } from '@ui/components/officerCard';
import { EmptySlot } from '@ui/components/emptySlot';
import { DetailsPanel } from '@ui/components/detailsPanel';
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
// OLD: import { HighlightPortal } from '@ui/components/highlightPortal';
import {
  HighlightSystem,
  CinematicHighlightPortal,
  HighlightType,
  type EnhancedHighlight
} from '@ui/highlights';

import {
  bindOnce,
  getRegisteredHotkeys,
  initHotkeys,
  registerHotkey
} from '@core/hotkeys';
import { ModeGate } from '@ui/components/modeGate';
// OLD: import { HighlightStore } from '@state/ui/highlights';
import { AudioManager } from '@ui/audio/manager';
import { AudioControls } from '@ui/audio/controls';
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
  { key: 'rivalries', label: 'Rivalitäten' },
  { key: 'neutralRelations', label: 'Neutrale Beziehungen' },
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
  private freeRoamHighlightHost: HTMLElement | null = null;
  private playerModeContainer: HTMLDivElement | null = null;
  private playerModeRoot: Root | null = null;
  private readonly cards = new Map<string, OfficerCard>();
  private readonly emptySlots = new Map<string, EmptySlot>(); // key: rank-slotIndex
  private readonly rankContainers = new Map<Rank, HTMLElement>();
  private readonly filters = new UIFilterStore();
  private readonly filterButtons = new Map<FilterKey, HTMLButtonElement>();
  private readonly officerIndex = new Map<string, Officer>();
  private lastRenderedOfficerState = new Map<string, Officer>();
  private readonly feed = new FeedView();
  private graveyard: GraveyardPanel | null = null;
  private relations: RelationsOverlay | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastEdges: RelationEdge[] = [];
  private readonly detailsPanel: DetailsPanel;
  private readonly warcallDock: WarcallsDock;
  private readonly warcallModal: WarcallModal;
  private readonly helpOverlay = new HelpOverlay();
  private readonly toast = new Toast();
  private readonly cycleSweep = new CycleSweep();
  // NEW: Replace old highlight system with new modular system
  private readonly highlightSystem = new HighlightSystem();
  private readonly cinematicPortal: CinematicHighlightPortal;

  private filterBarEl: HTMLElement | null = null;
  private rankListEl: HTMLElement | null = null;
  private sortSelect: HTMLSelectElement | null = null;
  private completedWarcalls: WarcallEntry[] = [];
  private warcallTab: WarcallStatus = 'active';
  private readonly hotkeyHints = new Set<string>();
  private readonly modeGate: ModeGate;
  private modeState: UIModeState;
  private digestHistoryEl: HTMLElement | null = null;
  private feedBodyEl: HTMLElement | null = null;
  private readonly audioManager: AudioManager;
  private audioControls: AudioControls | null = null;

  constructor(
    private readonly store: GameStore,
    private readonly modeStore: UIModeStore,
    audioManager?: AudioManager
  ) {
    this.audioManager = audioManager || new AudioManager();
    const state = store.getState();
    this.modeState = modeStore.getState();
    this.syncOfficerIndex(state.officers);
    this.graveyard = new GraveyardPanel(state.graveyard);

    this.detailsPanel = new DetailsPanel({
      resolveName: (id) => this.officerIndex.get(id)?.name
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

    // NEW: Initialize new cinematic highlight portal with enhanced options
    this.cinematicPortal = new CinematicHighlightPortal({
      onAdvance: () => this.highlightSystem.advance(),
      onSkip: () => this.highlightSystem.skip(),
      onSkipAll: () => this.highlightSystem.clearAll(),
      onToggleEnabled: (enabled) =>
        this.highlightSystem.updateOptions({ enabled }),
      onViewLog: () => this.focusDigestHistory()
    });

    this.filters.on('change', () => {
      this.syncFilterControls();
      if (this.ranksEl) {
        this.ranksEl.scrollTop = 0;
      }
      this.renderOfficersHierarchical(this.store.getState());
    });

    // NEW: Listen to new highlight system events
    this.highlightSystem.on('highlight:shown', (highlight) => {
      const state = this.highlightSystem.getState();
      console.log('[UI] highlight:shown event received', {
        highlight: highlight.title,
        stateShowing: state.showing?.title || 'none'
      });
      this.cinematicPortal.update(highlight, state.options);
      this.renderDigestHistory(state.history);
    });

    this.highlightSystem.on('highlights:cleared', () => {
      const state = this.highlightSystem.getState();
      this.cinematicPortal.update(null, state.options);
      this.renderDigestHistory(state.history);
    });

    this.highlightSystem.on('options:changed', () => {
      const state = this.highlightSystem.getState();
      this.cinematicPortal.update(state.showing, state.options);
    });

    // Initialize digest history with current state
    this.renderDigestHistory(this.highlightSystem.getState().history);

    this.modeGate = new ModeGate({
      onConfirm: (mode) => this.handleModeConfirm(mode)
    });

    // Initialize audio controls
    this.audioControls = new AudioControls(this.audioManager, {
      onPlayPause: () =>
        this.rememberHint('audio-play', 'Musik pausiert/fortgesetzt.'),
      onMute: () =>
        this.rememberHint('audio-mute', 'Ton stumm geschaltet/aktiviert.'),
      onNextTrack: () => this.rememberHint('audio-next', 'Nächster Track.'),
      onPreviousTrack: () =>
        this.rememberHint('audio-prev', 'Vorheriger Track.'),
      onVolumeChange: () =>
        this.rememberHint('audio-volume', 'Lautstärke angepasst.')
    });
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
      // Debug logging for development
      if (
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('debugWorld')
      ) {
        console.log(
          `[UI] State changed - Cycle ${next.cycle}, Version ${next.version}, Officers: ${next.officers.length}`
        );
      }
      this.syncOfficerIndex(next.officers);
      this.renderOfficersHierarchical(next);
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

    // NEW: Use new highlight system directly
    store.events.on(
      'cycle:newHighlights',
      ({ cycle, previousState, currentState, summary }) => {
        console.log('[UI] cycle:newHighlights event received', {
          cycle,
          hasSpawns: !!summary.spawns?.length,
          hasDeaths: !!summary.deaths?.length
        });
        // Generate highlights using new modular system
        this.highlightSystem.processcycle(previousState, currentState, summary);
      }
    );

    // OLD: Process highlights generated by computeDigest using new cinematic system (fallback)
    store.events.on('cycle:digest', ({ cycle, highlights }) => {
      // Only use this as fallback if new system produced no highlights
      const currentHighlights = this.highlightSystem.getState().queue;
      if (currentHighlights.length === 0 && highlights.length > 0) {
        // Convert legacy highlights to enhanced format for display
        const enhancedHighlights = this.convertLegacyHighlights(
          highlights,
          cycle
        );
        this.enqueueEnhancedHighlights(enhancedHighlights, cycle);
      }
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

  private handleModeConfirm(mode: GameMode): void {
    this.modeStore.setMode(mode);
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
    const isPlayerMode = this.modeState.mode === 'player';

    if (this.appRoot) {
      if (isFreeRoam || isPlayerMode) {
        this.appRoot.setAttribute('hidden', 'true');
        this.appRoot.setAttribute('aria-hidden', 'true');
        this.appRoot.style.display = 'none'; // Force hide with CSS
      } else {
        this.appRoot.removeAttribute('hidden');
        this.appRoot.removeAttribute('aria-hidden');
        this.appRoot.style.display = ''; // Reset to CSS default
      }
    }

    if (isFreeRoam) {
      this.openFreeRoam();
      this.closePlayerMode();
    } else if (isPlayerMode) {
      this.closeFreeRoam();
      this.openPlayerMode();
    } else {
      this.closeFreeRoam();
      this.closePlayerMode();
    }
  }

  private setFreeRoamHighlightHost(host: HTMLElement | null): void {
    this.freeRoamHighlightHost = host;
    if (host) {
      this.cinematicPortal.attach(host);
    } else if (typeof document !== 'undefined' && document.body) {
      this.cinematicPortal.attach(document.body);
    }
  }

  private shouldShowModeGate(): boolean {
    // Only show mode gate if no mode parameter was provided in URL
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return !params.has('mode');
  }

  private openFreeRoam(): void {
    if (!this.freeRoamContainer) return;
    if (!this.freeRoamRoot) {
      this.freeRoamRoot = createRoot(this.freeRoamContainer);
    }
    this.freeRoamContainer.hidden = false;
    this.freeRoamContainer.removeAttribute('aria-hidden');

    // Get map parameter from URL - use procedural maps by default
    this.freeRoamRoot.render(
      createElement(FreeRoamView, {
        store: this.store,
        onRequestClose: () => this.modeStore.setMode('spectate'),
        onHighlightHostChange: (host) => this.setFreeRoamHighlightHost(host)
      })
    );
  }

  private closeFreeRoam(): void {
    if (this.freeRoamContainer) {
      this.freeRoamContainer.hidden = true;
      this.freeRoamContainer.setAttribute('aria-hidden', 'true');
    }
    if (this.freeRoamHighlightHost) {
      this.setFreeRoamHighlightHost(null);
    }
    if (this.freeRoamRoot) {
      this.freeRoamRoot.unmount();
      this.freeRoamRoot = null;
    }
  }

  private openPlayerMode(): void {
    if (!this.playerModeContainer) return;
    if (!this.playerModeRoot) {
      this.playerModeRoot = createRoot(this.playerModeContainer);
    }
    this.playerModeContainer.hidden = false;
    this.playerModeContainer.removeAttribute('aria-hidden');
    this.playerModeRoot.render(bootstrapPlayerMode());
  }

  private closePlayerMode(): void {
    if (this.playerModeContainer) {
      this.playerModeContainer.hidden = true;
      this.playerModeContainer.setAttribute('aria-hidden', 'true');
    }
    if (this.playerModeRoot) {
      this.playerModeRoot.unmount();
      this.playerModeRoot = null;
    }
  }

  mount(root: HTMLElement): void {
    this.root = root;
    root.innerHTML = '';
    const app = document.createElement('div');
    app.className = 'nemesis-app';
    app.innerHTML = `
      <header class="hud">
        <div class="brand">NEMESIS HOF</div>
        <div class="hud-mode" data-mode-indicator>Spectate-Modus</div>
        <div class="hud-audio" id="audio-controls-container"></div>
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
    this.freeRoamContainer.addEventListener('click', (event) => {
      if (
        event.target === this.freeRoamContainer &&
        this.modeState.mode === 'freeRoam'
      ) {
        this.modeStore.setMode('spectate');
      }
    });
    root.appendChild(this.freeRoamContainer);

    // Create player mode container
    this.playerModeContainer = document.createElement('div');
    this.playerModeContainer.className = 'player-mode-shell';
    this.playerModeContainer.hidden = true;
    this.playerModeContainer.setAttribute('aria-hidden', 'true');
    this.playerModeContainer.addEventListener('click', (event) => {
      if (
        event.target === this.playerModeContainer &&
        this.modeState.mode === 'player'
      ) {
        // Don't auto-close player mode on container click
        // Player mode has its own UI for exiting
      }
    });
    root.appendChild(this.playerModeContainer);

    this.cinematicPortal.attach(document.body);

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
      this.renderDigestHistory(this.highlightSystem.getState().history);
    }

    this.warcallsHost?.appendChild(this.warcallDock.element);

    // Add audio controls to the header
    const audioContainer = app.querySelector('#audio-controls-container');
    if (audioContainer && this.audioControls) {
      audioContainer.appendChild(this.audioControls.getElement());
    }

    // Mount details panel at the bottom of the page
    this.detailsPanel.mount(document.body);

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
    this.renderOfficersHierarchical(initialState);
    this.renderFeed();
    this.updateWarcalls(initialState.warcalls, initialState.cycle);
    this.updateGraveyardButton();

    initHotkeys();
    this.registerHotkeys();

    // Only show mode gate if no mode was explicitly set via URL
    if (this.shouldShowModeGate()) {
      this.modeGate.open(this.modeState.mode);
    }

    // Start background music after a short delay to allow user interaction
    setTimeout(() => {
      this.audioManager.play().catch(() => {
        // Autoplay blocked - this is expected on many browsers
        console.log(
          '[AudioManager] Autoplay blocked - user interaction required'
        );
      });
    }, 1000);
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

    // Add neutral relations toggle as per redesign requirements
    const neutralToggle = document.createElement('div');
    neutralToggle.className = 'neutral-relations-toggle';
    const neutralCheckbox = document.createElement('input');
    neutralCheckbox.type = 'checkbox';
    neutralCheckbox.id = 'show-neutral-relations';
    neutralCheckbox.checked = this.filters.getState().neutralRelations ?? false;
    neutralCheckbox.addEventListener('change', () => {
      this.toggleFilter('neutralRelations');
      this.updateNeutralCounter();
    });
    const neutralLabel = document.createElement('label');
    neutralLabel.htmlFor = 'show-neutral-relations';
    neutralLabel.className = 'neutral-relations-label';
    neutralLabel.innerHTML =
      '• Neutrale Beziehungen anzeigen <span class="neutral-counter" id="neutral-counter">+0 Neutral</span>';
    neutralToggle.append(neutralCheckbox, neutralLabel);
    bar.appendChild(neutralToggle);

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

  private updateNeutralCounter(): void {
    const counterEl = document.getElementById('neutral-counter');
    if (!counterEl) return;

    const state = this.store.getState();
    let neutralCount = 0;
    state.officers.forEach((officer) => {
      neutralCount += officer.relationships.filter(
        (rel) => rel.type === 'NEUTRAL'
      ).length;
    });

    counterEl.textContent = `+${neutralCount} Neutral`;
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
    // Only register spectate mode hotkeys when not in Free Roam or Player mode
    registerHotkey('e', () => {
      if (this.modeState.mode === 'freeRoam') {
        this.toast.show('Cycle-Hotkey im Free-Roam-Modus deaktiviert.');
        return;
      }
      if (this.modeState.mode === 'player') {
        this.toast.show(
          'Cycle-Hotkey im Player-Modus deaktiviert. Verwende E für Signature-Moves.'
        );
        return;
      }
      this.triggerCycle();
    });
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

    // Audio control hotkeys
    registerHotkey('m', () => {
      this.audioManager.toggleMute();
      this.rememberHint('m', 'Musik stumm geschaltet/aktiviert (Hotkey M).');
    });
    registerHotkey('p', () => {
      this.audioManager.togglePlayPause();
      this.rememberHint('p', 'Musik pausiert/fortgesetzt (Hotkey P).');
    });
    registerHotkey('[', () => {
      this.audioManager.previousTrack();
      this.rememberHint('[', 'Vorheriger Track (Hotkey [).');
    });
    registerHotkey(']', () => {
      this.audioManager.nextTrack();
      this.rememberHint(']', 'Nächster Track (Hotkey ]).');
    });

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

  private hasOfficerChanged(officer: Officer): boolean {
    const lastState = this.lastRenderedOfficerState.get(officer.id);
    if (!lastState) return true;

    // Check for meaningful changes that would require UI updates
    return (
      lastState.rank !== officer.rank ||
      lastState.name !== officer.name ||
      lastState.level !== officer.level ||
      lastState.merit !== officer.merit ||
      lastState.traits.length !== officer.traits.length ||
      lastState.traits.some(
        (trait, index) => trait !== officer.traits[index]
      ) ||
      lastState.relationships.length !== officer.relationships.length ||
      lastState.relationships.some(
        (rel, index) =>
          !officer.relationships[index] ||
          rel.with !== officer.relationships[index].with ||
          rel.type !== officer.relationships[index].type
      ) ||
      Math.abs(lastState.personality.gier - officer.personality.gier) > 0.001 ||
      Math.abs(
        lastState.personality.tapferkeit - officer.personality.tapferkeit
      ) > 0.001 ||
      Math.abs(
        lastState.personality.loyalitaet - officer.personality.loyalitaet
      ) > 0.001 ||
      Math.abs(lastState.personality.stolz - officer.personality.stolz) > 0.001
    );
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
        this.lastRenderedOfficerState.delete(id);
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
          // Only update if officer data has meaningfully changed
          const hasChanged = this.hasOfficerChanged(officer);
          if (hasChanged) {
            existing.captureBounds();
            existing.update(officer);
            existing.playFlip();
            this.lastRenderedOfficerState.set(officer.id, {
              ...officer,
              personality: { ...officer.personality },
              relationships: [...officer.relationships],
              traits: [...officer.traits]
            });
          }
          // Always ensure element is in correct position
          grid.appendChild(existing.element);
        } else {
          const card = new OfficerCard(officer, {
            onOfficerClick: (officer) =>
              this.detailsPanel.showOfficerDetails(officer)
          });
          this.cards.set(officer.id, card);
          grid.appendChild(card.element);
          this.lastRenderedOfficerState.set(officer.id, {
            ...officer,
            personality: { ...officer.personality },
            relationships: [...officer.relationships],
            traits: [...officer.traits]
          });
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

  private renderOfficersHierarchical(state: WorldState): void {
    const rankList = this.rankListEl;
    if (!rankList) return;
    const filters = this.filters.getState();
    const visible = selectVisibleOfficers(state, filters);

    // Create hierarchy layout if it doesn't exist
    if (!this.hierarchyContainer) {
      this.createHierarchyStructure(rankList);
    }

    // Render each rank with fixed slots
    RANK_ORDER.forEach((rank) => {
      if (rank === 'Spieler') return; // Skip Spieler rank

      const maxSlots = RANK_QUOTAS[rank];
      const officers = visible.filter((officer) => officer.rank === rank);
      const container = this.rankContainers.get(rank);

      if (!container) return;
      const grid = container.querySelector('.rank-grid') as HTMLElement | null;
      if (!grid) return;

      // Clear existing content
      grid.innerHTML = '';

      // Render officer cards and empty slots
      for (let slotIndex = 0; slotIndex < maxSlots; slotIndex++) {
        const officer = officers[slotIndex];
        const slotKey = `${rank}-${slotIndex}`;

        if (officer) {
          // Render officer card
          let card = this.cards.get(officer.id);
          if (!card) {
            card = new OfficerCard(officer, {
              onOfficerClick: (officer) =>
                this.detailsPanel.showOfficerDetails(officer)
            });
            this.cards.set(officer.id, card);
            this.lastRenderedOfficerState.set(officer.id, {
              ...officer,
              personality: { ...officer.personality },
              relationships: [...officer.relationships],
              traits: [...officer.traits]
            });
          } else {
            // Update existing card if changed
            const hasChanged = this.hasOfficerChanged(officer);
            if (hasChanged) {
              card.captureBounds();
              card.update(officer);
              card.playFlip();
              this.lastRenderedOfficerState.set(officer.id, {
                ...officer,
                personality: { ...officer.personality },
                relationships: [...officer.relationships],
                traits: [...officer.traits]
              });
            }
          }

          // Clean up any existing empty slot
          const existingEmptySlot = this.emptySlots.get(slotKey);
          if (existingEmptySlot) {
            existingEmptySlot.destroy();
            this.emptySlots.delete(slotKey);
          }

          grid.appendChild(card.element);
        } else {
          // Render empty slot
          let emptySlot = this.emptySlots.get(slotKey);
          if (!emptySlot) {
            emptySlot = new EmptySlot({
              rank,
              slotIndex,
              onClick: () => {
                // Show tooltip about promotion requirements
                this.toast.show(
                  `Rang ${rank}: Slot ${slotIndex + 1} wartet auf Beförderung`
                );
              }
            });
            this.emptySlots.set(slotKey, emptySlot);
          }

          grid.appendChild(emptySlot.element);
        }
      }

      // Update the count display
      const countElement = container.querySelector(
        `[data-rank-count="${rank}"]`
      );
      if (countElement) {
        countElement.textContent = `${officers.length}/${maxSlots}`;
      }
    });

    // Clean up cards for officers that are no longer visible
    const visibleIds = new Set(visible.map((officer) => officer.id));
    this.cards.forEach((card, id) => {
      if (!visibleIds.has(id)) {
        card.element.remove();
        this.cards.delete(id);
        this.lastRenderedOfficerState.delete(id);
      }
    });

    // Update relations overlay
    if (this.relations) {
      const allEdges = buildRelationEdges(state.officers, state.cycle);
      this.lastEdges = allEdges;
      const maskedEdges = selectVisibleEdges(visible, allEdges, filters);
      this.relations.setLensMask(lensMaskForFilters(filters));
      this.relations.setEdges(maskedEdges, state.cycle);
    }

    // Update neutral relations counter
    this.updateNeutralCounter();
  }

  private hierarchyContainer: HTMLElement | null = null;

  private createHierarchyStructure(rankList: HTMLElement): void {
    // Clear existing content
    rankList.innerHTML = '';

    // Create hierarchy container
    this.hierarchyContainer = document.createElement('div');
    this.hierarchyContainer.className = 'hierarchy-container';

    // Create rank containers in hierarchical order
    RANK_ORDER.forEach((rank) => {
      if (rank === 'Spieler') return; // Skip Spieler rank

      const container = document.createElement('div');
      container.className = 'rank-group';
      container.dataset.rank = rank;

      // Add rank-specific styling classes
      const rankClass = this.getRankStyleClass(rank);
      container.classList.add(`rank-group--${rankClass}`);

      container.innerHTML = `
        <h3 class="rank-group__title">
          <span class="rank-group__icon">${this.getRankIcon(rank)}</span>
          ${rank}
          <span class="rank-group__count" data-rank-count="${rank}">0/${RANK_QUOTAS[rank]}</span>
        </h3>
        <div class="rank-grid"></div>
      `;

      this.rankContainers.set(rank, container);
      if (this.hierarchyContainer) {
        this.hierarchyContainer.appendChild(container);
      }
    });

    if (this.hierarchyContainer) {
      rankList.appendChild(this.hierarchyContainer);
    }
  }

  private getRankStyleClass(rank: Rank): string {
    const classes: Record<Rank, string> = {
      König: 'king',
      Spieler: 'player',
      Captain: 'captain',
      Späher: 'scout',
      Grunzer: 'grunt'
    };
    return classes[rank];
  }

  private getRankIcon(rank: Rank): string {
    const icons: Record<Rank, string> = {
      König: '👑',
      Spieler: '🎮',
      Captain: '⚡',
      Späher: '👁',
      Grunzer: '⚔'
    };
    return icons[rank];
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

  /**
   * Convert legacy highlights to enhanced format for backward compatibility
   * TODO: Remove this when store is updated to use new highlight system directly
   */
  private convertLegacyHighlights(
    legacyHighlights: any[], // Old Highlight interface
    cycle: number
  ): EnhancedHighlight[] {
    return legacyHighlights.map((legacy) => {
      // Map legacy highlight types to new enum values
      let type = HighlightType.NEW_GRUNT; // Default
      let priority = 5;
      let animationType:
        | 'confrontation'
        | 'celebration'
        | 'tragedy'
        | 'emergence' = 'emergence';

      if (legacy.id.startsWith('death:')) {
        type = HighlightType.OFFICER_DEATH;
        priority = 1;
        animationType = 'tragedy';
      } else if (legacy.id.startsWith('warcall:')) {
        type = HighlightType.WARCALL_RESOLUTION;
        priority = 2;
        animationType = 'confrontation';
      } else if (
        legacy.id.startsWith('rival:') ||
        legacy.id.startsWith('ally:')
      ) {
        type = HighlightType.DIPLOMACY;
        priority = 3;
        animationType = 'confrontation';
      } else if (
        legacy.id.startsWith('rank:') ||
        legacy.id.startsWith('promotion:')
      ) {
        type = HighlightType.PROMOTION;
        priority = 4;
        animationType = 'celebration';
      } else if (legacy.id.startsWith('spawn:')) {
        type = HighlightType.NEW_GRUNT;
        priority = 5;
        animationType = 'emergence';
      }

      return {
        id: legacy.id,
        type,
        priority,
        cycle: legacy.cycle || cycle,
        icon: legacy.icon,
        title: legacy.title,
        description: legacy.text,
        score: legacy.score || priority + Math.random() * 0.1,
        text: legacy.text,
        animationType,
        duration: 2000
      };
    });
  }

  /**
   * Manually enqueue enhanced highlights into the new system
   */
  private enqueueEnhancedHighlights(
    highlights: EnhancedHighlight[],
    cycle: number
  ): void {
    // Sort by priority and enqueue manually
    const sorted = highlights.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.id.localeCompare(b.id);
    });

    // Add to the highlight system queue
    const state = this.highlightSystem.getState();
    const newQueue = [...state.queue, ...sorted];
    const newHistory = [sorted, ...state.history].slice(0, 15);

    let showing = state.showing;
    let queue = newQueue;

    // Auto-advance if nothing is currently showing
    if (!showing && queue.length > 0) {
      [showing, ...queue] = queue;
    }

    // Update the system state manually (internal method, but needed for transition)
    (this.highlightSystem as any).state = {
      ...state,
      queue,
      showing,
      history: newHistory
    };

    // Trigger UI update
    if (showing) {
      this.cinematicPortal.update(showing, state.options);
    }
    this.renderDigestHistory(newHistory);
  }

  destroy(): void {
    // Clean up audio resources
    this.audioManager.destroy();
    this.audioControls?.destroy();

    // Clean up details panel
    this.detailsPanel.destroy();

    // Clean up other resources
    this.resizeObserver?.disconnect();
    this.freeRoamRoot?.unmount();
    this.playerModeRoot?.unmount();
  }
}
