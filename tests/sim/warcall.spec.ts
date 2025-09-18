import { describe, expect, it } from 'vitest';

import { calculateBreakdown, planWarcall } from '../../src/sim/warcall';
import { RNG } from '../../src/sim/rng';
import { createWorld } from '../../src/sim/world';

function collectParticipants(
  state: ReturnType<typeof createWorld>,
  ids: string[]
) {
  return ids.map((id) => {
    const officer = state.officers.find((candidate) => candidate.id === id);
    if (!officer) throw new Error('missing officer');
    return officer;
  });
}

describe('warcall', () => {
  it('produces deterministic breakdowns for the same seed', () => {
    const seed = 'warcall-deterministic';
    const rngA = new RNG(seed);
    const stateA = createWorld(seed, rngA);
    const warcallA = planWarcall(stateA, rngA, stateA.cycle);
    if (!warcallA) throw new Error('warcall missing');
    const participantsA = collectParticipants(stateA, warcallA.participants);
    const breakdownA = calculateBreakdown(
      rngA,
      warcallA,
      participantsA,
      stateA.kingStatus
    );

    const rngB = new RNG(seed);
    const stateB = createWorld(seed, rngB);
    const warcallB = planWarcall(stateB, rngB, stateB.cycle);
    if (!warcallB) throw new Error('warcall missing');
    const participantsB = collectParticipants(stateB, warcallB.participants);
    const breakdownB = calculateBreakdown(
      rngB,
      warcallB,
      participantsB,
      stateB.kingStatus
    );

    expect(breakdownA).toEqual(breakdownB);
  });

  it('reports components that sum to the logistic input', () => {
    const rng = new RNG('warcall-components');
    const state = createWorld('warcall-components', rng);
    const warcall = planWarcall(state, rng, state.cycle);
    if (!warcall) throw new Error('warcall missing');
    const participants = collectParticipants(state, warcall.participants);
    const breakdown = calculateBreakdown(
      rng,
      warcall,
      participants,
      state.kingStatus
    );

    const sum =
      breakdown.base +
      breakdown.traits +
      breakdown.relationships +
      breakdown.random;
    expect(breakdown.logistic).toBeCloseTo(sum, 5);
  });
});
