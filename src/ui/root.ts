import type { GameStore } from '@state/store';
import type { Officer, WarcallResolution } from '@sim/types';
import { FeedView } from '@ui/components/feed';
import { GraveyardPanel } from '@ui/components/graveyard';
import { HotkeyBar } from '@ui/components/hotkeys';
import { OfficerToken } from '@ui/components/officerToken';
import { TooltipBreakdown } from '@ui/components/tooltip';

export class NemesisUI {
  readonly feed = new FeedView();
  readonly tooltip = new TooltipBreakdown();
  readonly hotkeys = new HotkeyBar();
  graveyard: GraveyardPanel | null = null;
  private readonly tokens = new Map<string, OfficerToken>();

  constructor(private readonly store: GameStore) {
    this.syncOfficers(store.getState().officers);
    this.graveyard = new GraveyardPanel(store.getState().graveyard);

    store.events.on('feed:appended', (entries) => {
      this.feed.render(entries);
    });

    store.events.on('graveyard:changed', (officers) => {
      this.graveyard = new GraveyardPanel(officers);
    });

    store.events.on('state:changed', (state) => {
      this.syncOfficers(state.officers);
    });

    store.events.on('cycle:completed', (summary) => {
      const resolution = summary.warcallsResolved.at(-1);
      if (resolution) {
        this.showWarcall(resolution);
      }
    });
  }

  private syncOfficers(officers: Officer[]): void {
    this.tokens.clear();
    officers.forEach((officer) => {
      this.tokens.set(officer.id, new OfficerToken(officer));
    });
  }

  getToken(id: string): OfficerToken | undefined {
    return this.tokens.get(id);
  }

  showWarcall(resolution: WarcallResolution): void {
    this.tooltip.show(resolution);
  }

  hideTooltip(): void {
    this.tooltip.hide();
  }
}
