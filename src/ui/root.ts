import type { Rank, Officer, WarcallPlan, WarcallResolution } from '@sim/types';
import type { GameStore } from '@state/store';
import { FeedView } from '@ui/components/feed';
import { GraveyardPanel } from '@ui/components/graveyard';
import { OfficerCard } from '@ui/components/officerCard';
import { OfficerTooltip } from '@ui/components/officerTooltip';
import {
  buildRelationEdges,
  RelationsOverlay
} from '@ui/components/relationsOverlay';
import type { RelationEdge } from '@ui/components/relationsOverlay';
import { WarcallsDock } from '@ui/components/warcalls/dock';
import { WarcallModal } from '@ui/components/warcalls/modal';
import type { WarcallEntry } from '@ui/components/warcalls/types';
import { HelpOverlay } from '@ui/components/helpOverlay';
import { Toast } from '@ui/components/toast';
import { CycleSweep } from '@ui/components/cycleSweep';
import {
  bindOnce,
  getRegisteredHotkeys,
  initHotkeys,
  registerHotkey
} from '@core/hotkeys';

const RANK_ORDER: Rank[] = ['König', 'Spieler', 'Captain', 'Späher', 'Grunzer'];
const MAX_COMPLETED_WARCALLS = 8;
const RELATIONS_OVERLAY_ENABLED = true;

export class NemesisUI {
  private root: HTMLElement | null = null;
  private ranksEl: HTMLElement | null = null;
  private feedEl: HTMLElement | null = null;
  private warcallsHost: HTMLElement | null = null;
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
  private readonly completedWarcalls: WarcallEntry[] = [];
  private readonly hotkeyHints = new Set<string>();

  constructor(private readonly store: GameStore) {
    const state = store.getState();
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
      onOpenDetails: (entry) => this.openWarcall(entry)
    });

    this.warcallModal = new WarcallModal({
      onClose: () => document.body.classList.remove('modal-open'),
      onJoin: () =>
        this.toast.show('Kommando: Teilnahme derzeit nur simuliert.'),
      onRedirect: () => this.toast.show('Umlenkung wird protokolliert.'),
      onSabotage: () => this.toast.show('Sabotage ist noch in Arbeit.')
    });

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
    store.events.on('warcall:planned', () => {
      const state = this.store.getState();
      this.updateWarcalls(state.warcalls, state.cycle);
      this.toast.show('Neuer Warcall eingetragen.');
    });
    store.events.on('warcall:resolved', (resolution) => {
      this.onWarcallResolved(resolution);
    });
  }

  mount(root: HTMLElement): void {
    this.root = root;
    root.innerHTML = '';
    const app = document.createElement('div');
    app.className = 'nemesis-app';
    app.innerHTML = `
      <header class="hud">
        <div class="brand">NEMESIS HOF</div>
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

    this.warcallsHost?.appendChild(this.warcallDock.element);
    this.registerUIEvents(app);
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
        getOfficerElement: (id) => this.cards.get(id)?.element
      });
      this.lastEdges = buildRelationEdges(
        this.store.getState().officers,
        true,
        this.store.getState().cycle
      );
      this.relations.setEdges(this.lastEdges);
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.relations) return;
        const state = this.store.getState();
        this.lastEdges = buildRelationEdges(state.officers, true, state.cycle);
        this.relations.setEdges(this.lastEdges);
      });
      this.resizeObserver.observe(this.ranksEl);
      this.ranksEl.addEventListener('scroll', () => {
        if (!this.relations) return;
        this.relations.setEdges(this.lastEdges);
      });
    }

    initHotkeys();
    this.registerHotkeys();
  }

  private registerUIEvents(app: HTMLElement): void {
    app
      .querySelector<HTMLButtonElement>('button[data-action="cycle"]')
      ?.addEventListener('click', () => this.triggerCycle());
    app
      .querySelector<HTMLButtonElement>('button[data-action="reset"]')
      ?.addEventListener('click', () => this.reset());
    app
      .querySelector<HTMLButtonElement>('button[data-action="warcall"]')
      ?.addEventListener('click', () => this.scheduleWarcall());
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
    this.store.scheduleWarcall();
    this.rememberHint('n', 'Neuer Warcall (Hotkey N).');
  }

  private rememberHint(key: string, message: string): void {
    if (this.hotkeyHints.has(key)) return;
    this.hotkeyHints.add(key);
    this.toast.show(message);
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
      this.lastEdges = buildRelationEdges(state.officers, true, state.cycle);
      this.relations.setEdges(this.lastEdges);
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
    const mapEntry = (plan: WarcallPlan): WarcallEntry => ({
      plan,
      participants: plan.participants
        .map(
          (id) =>
            this.officerIndex.get(id) ??
            state.graveyard.find((o) => o.id === id)
        )
        .filter((o): o is Officer => Boolean(o)),
      currentCycle
    });

    const active: WarcallEntry[] = [];
    const pending: WarcallEntry[] = [];
    plans.forEach((plan) => {
      const entry = mapEntry(plan);
      const remaining = plan.resolveOn - currentCycle;
      if (remaining > 1) pending.push(entry);
      else active.push(entry);
    });

    const buckets = [
      { label: 'Aktiv', entries: active },
      { label: 'Ausstehend', entries: pending },
      { label: 'Abgeschlossen', entries: this.completedWarcalls }
    ];
    this.warcallDock.update(buckets);
  }

  private onWarcallResolved(resolution: WarcallResolution): void {
    const state = this.store.getState();
    const entry: WarcallEntry = {
      plan: resolution.warcall,
      participants: resolution.warcall.participants
        .map(
          (id) =>
            this.officerIndex.get(id) ??
            state.graveyard.find((o) => o.id === id)
        )
        .filter((o): o is Officer => Boolean(o)),
      currentCycle: state.cycle,
      resolution
    };
    this.completedWarcalls.unshift(entry);
    this.completedWarcalls.splice(MAX_COMPLETED_WARCALLS);
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
