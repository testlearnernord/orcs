import { advanceCycle } from '@sim/cycle';
import { RNG } from '@sim/rng';
import type { CycleSummary, WarcallPlan, WorldState } from '@sim/types';
import { enqueuePlannedWarcalls, planWarcall } from '@sim/warcall';
import { createWorld } from '@sim/world';
import { EventBus } from '@state/eventBus';
import type { GameEvents } from '@state/events';
import { computeDigest } from '@state/cycleDigest';
import { snapshotWorld } from '@state/snapshot';

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
    const previous = snapshotWorld(this.state);
    const summary = advanceCycle(this.state, this.rng);

    // Create a new state reference to ensure UI reactivity
    this.state = {
      ...this.state,
      version: this.state.version,
      updatedAt: this.state.updatedAt,
      cycle: this.state.cycle,
      officers: [...this.state.officers],
      graveyard: [...this.state.graveyard],
      warcalls: [...this.state.warcalls],
      feed: [...this.state.feed],
      crown: { ...this.state.crown }
    };

    // Debug logging for development
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('debugWorld')
    ) {
      console.log(
        `[World] Cycle ${this.state.cycle}, Version ${this.state.version}, Officers: ${this.state.officers.length}, Deaths: ${summary.deaths.length}, Spawns: ${summary.spawns.length}`
      );
    }

    this.events.emit('cycle:completed', summary);
    summary.warcallsResolved.forEach((resolution) =>
      this.events.emit('warcall:resolved', resolution)
    );
    if (summary.feed.length > 0) {
      this.events.emit('feed:appended', summary.feed);
    }
    this.events.emit('graveyard:changed', this.state.graveyard);
    this.events.emit('state:changed', this.state);

    // NEW: Use new highlight system directly with actual state data
    this.events.emit('cycle:newHighlights', {
      cycle: this.state.cycle,
      previousState: previous,
      currentState: this.state,
      summary
    });

    // OLD: Keep legacy system for backward compatibility temporarily
    const digest = computeDigest(previous, this.state, summary);
    this.events.emit('cycle:digest', {
      cycle: this.state.cycle,
      highlights: digest
    });

    summary.warcallsPlanned.forEach((plan) =>
      this.events.emit('warcall:planned', plan)
    );
    return summary;
  }

  scheduleWarcall(): WarcallPlan | undefined {
    const plan = planWarcall(this.state, this.rng, this.state.cycle);
    if (!plan) return undefined;
    enqueuePlannedWarcalls(this.state, [plan]);

    // Create a new state reference to ensure UI reactivity
    this.state = {
      ...this.state,
      version: (this.state.version || 0) + 1,
      updatedAt: Date.now(),
      warcalls: [...this.state.warcalls]
    };

    this.events.emit('warcall:planned', plan);
    this.events.emit('state:changed', this.state);
    return plan;
  }
}
