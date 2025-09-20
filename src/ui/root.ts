import type {
  Rank,
  Officer,
  WarcallPlan,
  WarcallResolution,
  WorldState
} from '@sim/types';
import type { GameStore } from '@state/store';
import type { GameMode, UIModeState, UIModeStore } from '@state/ui/mode';
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
import { CycleDigest } from '@ui/components/cycleDigest';
import {
  bindOnce,
  getRegisteredHotkeys,
  initHotkeys,
  registerHotkey
} from '@core/hotkeys';
import { ModeGate } from '@ui/components/modeGate';

const RANK_ORDER: Rank[] = ['König', 'Spieler', 'Captain', 'Späher', 'Grunzer'];
const MAX_COMPLETED_WARCALLS = 8;
const RELATIONS_OVERLAY_ENABLED = true;

export class NemesisUI {
  private root: HTMLElement | null = null;
  private ranksEl: HTMLElement | null = null;
  private feedEl: HTMLElement | null = null;
  private warcallsHost: HTMLElement | null = null;
  private modeIndicator: HTMLElement | null = null;
  private warcallButton: HTMLButtonElement | null = null;
  private readonly cards = new Map<string, OfficerCard>();
  private readonly rankContainers = new Map<Rank, HTMLElement>();
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
  private readonly cycleDigest = new CycleDigest();
  private completedWarcalls: WarcallEntry[] = [];
  private warcallTab: WarcallStatus = 'active';
  private readonly hotkeyHints = new Set<string>();
  private readonly modeGate: ModeGate;
  private modeState: UIModeState;

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

    this.modeGate = new ModeGate({
      onConfirm: (mode) => this.handleModeConfirm(mode)
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
      this.syncOfficerIndex(next.officers);
      this.renderOfficers(next.officers);
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
      this.cycleDigest.show(cycle, highlights);
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
    this.warcallModal.setMode(this.modeState.mode);
  }

  private applyModeToControls(): void {
    if (!this.warcallButton) return;
    const disabled = this.modeState.mode !== 'player';
    this.warcallButton.disabled = disabled;
    if (disabled) {
      this.warcallButton.setAttribute(
        'title',
        'Im Spectate-Mode nicht verfügbar.'
      );
    } else {
      this.warcallButton.removeAttribute('title');
    }
  }

  private syncModeIndicator(): void {
    if (!this.modeIndicator) return;
    const label =
      this.modeState.mode === 'player'
        ? 'Player-Modus (Beta)'
        : 'Spectate-Modus';
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

  mount(root: HTMLElement): void {
    this.root = root;
    root.innerHTML = '';
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
    root.appendChild(app);

    this.ranksEl = app.querySelector('#ranks');
    this.feedEl = app.querySelector('#feed');
    this.warcallsHost = app.querySelector('#warcalls');
    this.modeIndicator = app.querySelector('[data-mode-indicator]');

    this.warcallsHost?.appendChild(this.warcallDock.element);
    this.registerUIEvents(app);
    this.syncModeUI();
    this.renderOfficers(this.store.getState().officers);
    this.renderFeed();
    this.updateWarcalls(
      this.store.getState().warcalls,
      this.store.getState().cycle
    );
    this.updateGraveyardButton();

    if (RELATIONS_OVERLAY_ENABLED && this.ranksEl) {
      this.relations = new RelationsOverlay({
        host: this.ranksEl,
        getOfficerElement: (id) => this.cards.get(id)?.element,
        getOfficerData: (id) => this.officerIndex.get(id)
      });
      const state = this.store.getState();
      this.lastEdges = buildRelationEdges(state.officers, state.cycle);
      this.relations.setEdges(this.lastEdges, state.cycle);
      this.resizeObserver = new ResizeObserver(() => {
        this.relations?.refresh();
      });
      this.resizeObserver.observe(this.ranksEl);
      this.ranksEl.addEventListener('scroll', () => {
        this.relations?.refresh();
      });
    }

    initHotkeys();
    this.registerHotkeys();
    this.modeGate.open(this.modeState.mode);
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
      this.rememberHint('n-disabled', 'Im Spectate-Mode nicht verfügbar.');
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

  private renderOfficers(officers: Officer[]): void {
    if (!this.ranksEl) return;
    const existingIds = new Set(officers.map((o) => o.id));

    this.cards.forEach((card, id) => {
      if (!existingIds.has(id)) {
        card.element.remove();
        this.cards.delete(id);
      }
    });

    RANK_ORDER.forEach((rank) => {
      let container = this.rankContainers.get(rank);
      if (!container) {
        container = document.createElement('div');
        container.className = 'rank-group';
        container.innerHTML = `<h3>${rank}</h3><div class="rank-grid"></div>`;
        this.ranksEl?.appendChild(container);
        this.rankContainers.set(rank, container);
      }
      const grid = container.querySelector('.rank-grid') as HTMLElement;
      const members = officers.filter((o) => o.rank === rank);
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
    });

    if (this.relations) {
      const state = this.store.getState();
      this.lastEdges = buildRelationEdges(state.officers, state.cycle);
      this.relations.setEdges(this.lastEdges, state.cycle);
    }
  }

  private renderFeed(): void {
    if (!this.feedEl) return;
    const lines = this.feed.getLines();
    if (lines.length === 0) {
      this.feedEl.innerHTML =
        '<p class="feed-empty">Noch keine Ereignisse.</p>';
      return;
    }
    this.feedEl.innerHTML = lines
      .map((line) => `<div class="feed-item">${line.text}</div>`)
      .join('');
    this.feedEl.scrollTop = this.feedEl.scrollHeight;
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
