import { describe, expect, it } from 'vitest';

import { BLOOD_OATH_DURATION } from '@sim/constants';
import {
  expireBloodOaths,
  formRelationship,
  collectBloodOathVictims
} from '@sim/relationships';
import { RNG } from '@sim/rng';
import { createWorld } from '@sim/world';

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

    state.cycle += BLOOD_OATH_DURATION;
    expireBloodOaths(state, state.cycle, rng);

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
