import { describe, expect, it } from 'vitest';

import { advanceCycle } from '../../src/sim/cycle';
import { createWorld } from '../../src/sim/world';
import { RNG } from '../../src/sim/rng';
import type { WarcallPlan } from '../../src/sim/types';

function buildWarcall(participants: string[], resolveOn: number): WarcallPlan {
  return {
    id: 'warcall_test',
    cycleAnnounced: resolveOn - 1,
    resolveOn,
    initiator: participants[0],
    participants,
    location: 'Prügelgrube',
    baseDifficulty: 0.95
  };
}

describe('cycle', () => {
  it('keeps the roster at 20 active officers', () => {
    const rng = new RNG('cycle-20');
    const state = createWorld('cycle-20', rng);
    state.officers = state.officers.slice(0, 15);
    const summary = advanceCycle(state, rng);
    expect(state.officers).toHaveLength(20);
    expect(summary.spawns.length).toBeGreaterThanOrEqual(5);
  });

  it('processes deaths before spawns in the feed', () => {
    const rng = new RNG('cycle-order');
    const state = createWorld('cycle-order', rng);
    const participants = state.officers
      .slice(0, 3)
      .map((officer) => officer.id);
    state.warcalls.push(buildWarcall(participants, state.cycle + 1));

    const summary = advanceCycle(state, rng);
    const deathIndex = summary.feed.findIndex(
      (entry) => entry.tone === 'DEATH'
    );
    const spawnIndex = summary.feed.findIndex(
      (entry) => entry.tone === 'SPAWN'
    );

    expect(deathIndex).toBeGreaterThan(-1);
    expect(spawnIndex).toBeGreaterThan(-1);
    expect(deathIndex).toBeLessThan(spawnIndex);
  });
});
