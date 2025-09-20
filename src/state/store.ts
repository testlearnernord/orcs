import { advanceCycle } from '@sim/cycle';
import { RNG } from '@sim/rng';
import type { CycleSummary, WarcallPlan, WorldState } from '@sim/types';
import { enqueuePlannedWarcalls, planWarcall } from '@sim/warcall';
import { createWorld } from '@sim/world';
import { EventBus } from '@state/eventBus';
import type { GameEvents } from '@state/events';

export class GameStore {
  readonly events = new EventBus<GameEvents>();
  private readonly rng: RNG;
  private state: WorldState;

  constructor(seed: string) {
    this.rng = new RNG(seed);
    this.state = createWorld(seed, this.rng);
  }

  getState(): WorldState {
    return this.state;
  }

  tick(): CycleSummary {
    const summary = advanceCycle(this.state, this.rng);
    this.events.emit('cycle:completed', summary);
    summary.warcallsResolved.forEach((resolution) =>
      this.events.emit('warcall:resolved', resolution)
    );
    if (summary.feed.length > 0) {
      this.events.emit('feed:appended', summary.feed);
    }
    this.events.emit('graveyard:changed', this.state.graveyard);
    this.events.emit('state:changed', this.state);
    summary.warcallsPlanned.forEach((plan) =>
      this.events.emit('warcall:planned', plan)
    );
    return summary;
  }

  scheduleWarcall(): WarcallPlan | undefined {
    const plan = planWarcall(this.state, this.rng, this.state.cycle);
    if (!plan) return undefined;
    enqueuePlannedWarcalls(this.state, [plan]);
    this.events.emit('warcall:planned', plan);
    this.events.emit('state:changed', this.state);
    return plan;
  }
}
