import { describe, expect, it } from 'vitest';

import { advanceCycle } from '../../src/sim/cycle';
import { BLOOD_OATH_DURATION } from '../../src/sim/constants';
import {
  formRelationship,
  collectBloodOathVictims
} from '../../src/sim/relationships';
import { RNG } from '../../src/sim/rng';
import { createWorld } from '../../src/sim/world';

describe('blood oath', () => {
  it('expires after ten cycles and converts the bond', () => {
    const rng = new RNG('blood-expire');
    const state = createWorld('blood-expire', rng);
    const [first, second] = state.officers;
    formRelationship(
      state,
      first.id,
      second.id,
      'BLOOD_OATH',
      state.cycle,
      rng
    );

    for (let i = 0; i < BLOOD_OATH_DURATION; i += 1) {
      advanceCycle(state, rng);
    }

    const updated = state.officers.find((officer) => officer.id === first.id);
    const relation = updated?.relationships.find(
      (rel) => rel.with === second.id
    );
    expect(relation).toBeDefined();
    expect(relation?.type).not.toBe('BLOOD_OATH');
    expect(['ALLY', 'RIVAL', 'FRIEND']).toContain(relation?.type);
  });

  it('flags the partner for death when one falls', () => {
    const rng = new RNG('blood-chain');
    const state = createWorld('blood-chain', rng);
    const [first, second] = state.officers;
    formRelationship(
      state,
      first.id,
      second.id,
      'BLOOD_OATH',
      state.cycle,
      rng
    );

    const casualties = new Set<string>([first.id]);
    const extra = collectBloodOathVictims(state, casualties, state.cycle);
    expect(extra.has(second.id)).toBe(true);
  });
});
