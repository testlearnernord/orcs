import type { GameStore } from '@state/store';
import type { Officer, WarcallResolution } from '@sim/types';
import { getPortraitAsset } from '@sim/portraits';
import { FeedView } from '@ui/components/feed';
import { GraveyardPanel } from '@ui/components/graveyard';
import { HotkeyBar } from '@ui/components/hotkeys';
import { OfficerToken } from '@ui/components/officerToken';
import { TooltipBreakdown } from '@ui/components/tooltip';

export class NemesisUI {
  private root: HTMLElement | null = null;
  private feedEl: HTMLElement | null = null;
  private ranksEl: HTMLElement | null = null;

  readonly feed = new FeedView();
  readonly tooltip = new TooltipBreakdown();
  readonly hotkeys = new HotkeyBar();
  graveyard: GraveyardPanel | null = null;
  private readonly tokens = new Map<string, OfficerToken>();

  constructor(private readonly store: GameStore) {
    const state = store.getState();
    this.syncOfficers(state.officers);
    this.graveyard = new GraveyardPanel(state.graveyard);

    store.events.on('feed:appended', (entries) => {
      this.feed.render(entries);
      this.renderFeed();
    });
    store.events.on('graveyard:changed', (officers) => {
      this.graveyard = new GraveyardPanel(officers);
      this.updateGraveyardButton();
    });
    store.events.on('state:changed', (next) => {
      this.syncOfficers(next.officers);
      this.renderOfficers(next.officers);
    });
    store.events.on('cycle:completed', (summary) => {
      const last = summary.warcallsResolved.at(-1);
      if (last) this.showWarcall(last);
    });
  }

  mount(root: HTMLElement): void {
    this.root = root;
    root.innerHTML = `
      <div class="nemesis-app">
        <header class="hud">
          <div class="brand">NEMESIS HOF</div>
          <div class="spacer"></div>
          <button id="btn-cycle">E — CYCLE</button>
          <button id="btn-reset">R — NEU</button>
          <button id="btn-grave">FRIEDHOF (0)</button>
        </header>
        <main class="layout">
          <section class="ranks" id="ranks"></section>
          <aside class="feed" id="feed"></aside>
        </main>
      </div>`;
    this.feedEl = root.querySelector('#feed');
    this.ranksEl = root.querySelector('#ranks');

    root
      .querySelector<HTMLButtonElement>('#btn-cycle')!
      .addEventListener('click', () => this.store.tick());
    root
      .querySelector<HTMLButtonElement>('#btn-reset')!
      .addEventListener('click', () => location.reload());
    root
      .querySelector<HTMLButtonElement>('#btn-grave')!
      .addEventListener('click', () => alert('Graveyard overlay TODO'));

    this.updateGraveyardButton();
    this.renderOfficers(this.store.getState().officers);
    this.renderFeed();
  }

  private updateGraveyardButton(): void {
    if (!this.root) return;
    const btn = this.root.querySelector<HTMLButtonElement>('#btn-grave');
    if (!btn) return;
    const count = this.graveyard ? this.graveyard.size : 0;
    btn.textContent = `FRIEDHOF (${count})`;
  }

  private syncOfficers(officers: Officer[]): void {
    this.tokens.clear();
    officers.forEach((o) => this.tokens.set(o.id, new OfficerToken(o)));
  }

  private renderOfficers(officers: Officer[]): void {
    if (!this.ranksEl) return;
    const groups: Record<string, Officer[]> = {
      König: [],
      Spieler: [],
      Captain: [],
      Späher: [],
      Grunzer: []
    };
    officers.forEach((o) => groups[o.rank].push(o));

    const renderBars = (o: Officer) => {
      const p = o.personality;
      const row = (label: string, v: number) =>
        `<span>${label}</span><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div>`;
      return `<div class="bars">
      ${row('GIER', p.gier)}
      ${row('TAPFERKEIT', p.tapferkeit)}
      ${row('LOYALITÄT', p.loyalitaet)}
      ${row('STOLZ', p.stolz)}
    </div>`;
    };

    const renderCard = (o: Officer) => {
      const img = getPortraitAsset(o.portraitSeed);
      const badges = o.traits
        .map((t) => `<span class="badge">${t}</span>`)
        .join('');
      return `<article class="card" title="${o.name} (Lv ${o.level})">
      <div class="portrait">${img ? `<img alt="${o.name}" src="${img}">` : ''}</div>
      <div class="meta">
        <div class="title">${o.name} <small>Lv ${o.level} • ${o.rank}</small></div>
        <div class="badges">${badges}</div>
        ${renderBars(o)}
      </div>
    </article>`;
    };

    this.ranksEl.innerHTML = (
      ['König', 'Spieler', 'Captain', 'Späher', 'Grunzer'] as const
    )
      .map(
        (rank) => `
    <div class="rank-group">
      <h3>${rank}</h3>
      <div class="grid">
        ${groups[rank].map(renderCard).join('')}
      </div>
    </div>`
      )
      .join('');
  }

  private renderFeed(): void {
    if (!this.feedEl) return;
    const lines = this.feed.getLines();
    this.feedEl.innerHTML = lines
      .map((l) => `<div class="feed-item">${l.text}</div>`)
      .join('');
  }

  getToken(id: string): OfficerToken | undefined {
    return this.tokens.get(id);
  }
  showWarcall(r: WarcallResolution): void {
    this.tooltip.show(r);
  }
  hideTooltip(): void {
    this.tooltip.hide();
  }
}
