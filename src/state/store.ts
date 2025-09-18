import { advanceCycle } from '@sim/cycle';
import { RNG } from '@sim/rng';
import type { CycleSummary, WorldState } from '@sim/types';
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
    if (summary.feed.length > 0) {
      this.events.emit('feed:appended', summary.feed);
    }
    this.events.emit('graveyard:changed', this.state.graveyard);
    this.events.emit('state:changed', this.state);
    return summary;
  }
}
