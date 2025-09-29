import { describe, expect, it } from 'vitest';

import type { Officer, WorldState } from '@sim/types';
import {
  lensMaskForFilters,
  selectVisibleEdges,
  selectVisibleOfficers
} from '@state/selectors/officers';
import type { RelationEdge } from '@ui/overlay/RelationsOverlay';
import type { UIFilters } from '@state/ui/filters';

function makeOfficer(overrides: Partial<Officer> & { id: string }): Officer {
  return {
    id: overrides.id,
    stableId: overrides.stableId ?? overrides.id,
    name: overrides.name ?? `Officer ${overrides.id}`,
    rank: overrides.rank ?? 'Captain',
    merit: overrides.merit ?? 0.5,
    traits: overrides.traits ?? [],
    stats: overrides.stats ?? {
      potential: 'Normal',
      level: 5,
      hp: 100,
      maxHp: 100,
      str: 50,
      dex: 50,
      int: 50
    },
    mood: overrides.mood ?? {
      loyalitaet: overrides.rank === 'König' ? undefined : 50,
      ambition: 'Möchte stärker werden'
    },
    relationships: overrides.relationships ?? [],
    status: overrides.status ?? 'ALIVE',
    cycleJoined: overrides.cycleJoined ?? 0,
    cycleDied: overrides.cycleDied,
    memories: overrides.memories ?? []
  };
}

function makeState(overrides: Partial<WorldState> = {}): WorldState {
  return {
    seed: overrides.seed ?? 'seed',
    cycle: overrides.cycle ?? 0,
    officers: overrides.officers ?? [],
    graveyard: overrides.graveyard ?? [],
    warcalls: overrides.warcalls ?? [],
    kingId: overrides.kingId ?? 'king',
    kingStatus: overrides.kingStatus ?? 'GEFESTIGT',
    kingStatusExpires: overrides.kingStatusExpires ?? 0,
    feed: overrides.feed ?? [],
    playerId: overrides.playerId ?? null,
    crown:
      overrides.crown ??
      ({
        reignCycles: 0,
        crownPressure: 0,
        tributeRate: 0.1,
        instability: 'stable'
      } satisfies WorldState['crown'])
  };
}

const baseFilters: UIFilters = { sortBy: 'merit' };

describe('selectVisibleOfficers', () => {
  it('returns all officers since filters were removed', () => {
    const king = makeOfficer({
      id: 'king',
      rank: 'König',
      mood: { ambition: 'Möchte herrschen' } // König has no loyalty
    });
    const loyal = makeOfficer({
      id: 'a',
      mood: { loyalitaet: 80, ambition: 'Möchte dem König dienen' }
    });
    const disloyal = makeOfficer({
      id: 'b',
      mood: { loyalitaet: 20, ambition: 'Möchte rebellieren' }
    });
    const state = makeState({
      officers: [king, loyal, disloyal],
      kingId: king.id
    });
    const result = selectVisibleOfficers(state, {
      ...baseFilters
    });
    // All officers should be visible since filters were removed
    expect(result.map((o) => o.id)).toEqual(['king', 'a', 'b']);
  });

  it('returns all officers including rivals since filters were removed', () => {
    const king = makeOfficer({ id: 'king', rank: 'König' });
    const rival = makeOfficer({
      id: 'r',
      relationships: [{ with: 'king', type: 'RIVAL', sinceCycle: 1 }]
    });
    const neutral = makeOfficer({ id: 'n' });
    const state = makeState({
      officers: [king, rival, neutral],
      kingId: king.id
    });
    const result = selectVisibleOfficers(state, {
      ...baseFilters
    });
    // All officers should be visible since filters were removed
    expect(result.map((o) => o.id)).toEqual(['king', 'r', 'n']);
  });

  it('returns all officers since promotion candidate filtering was removed', () => {
    const king = makeOfficer({ id: 'king', rank: 'König', merit: 1 });
    const captainA = makeOfficer({ id: 'c1', merit: 0.9 });
    const captainB = makeOfficer({ id: 'c2', merit: 0.6 });
    const scoutA = makeOfficer({ id: 's1', rank: 'Späher', merit: 0.8 });
    const scoutB = makeOfficer({ id: 's2', rank: 'Späher', merit: 0.3 });
    const state = makeState({
      officers: [king, captainA, captainB, scoutA, scoutB],
      kingId: king.id
    });
    const result = selectVisibleOfficers(state, {
      ...baseFilters
    });
    // All officers should be visible since filters were removed
    expect(result.map((o) => o.id)).toEqual(['king', 'c1', 's1', 'c2', 's2']);
  });

  it('returns all officers since coup risk filtering was removed', () => {
    const king = makeOfficer({ id: 'king', rank: 'König', merit: 0.95 });
    const highRisk = makeOfficer({
      id: 'risk',
      merit: 0.82,
      mood: { loyalitaet: 20, ambition: 'Möchte König werden' },
      relationships: [{ with: 'king', type: 'RIVAL', sinceCycle: 2 }]
    });
    const lowMerit = makeOfficer({
      id: 'low',
      merit: 0.4,
      mood: { loyalitaet: 25, ambition: 'Möchte rebellieren' },
      relationships: [{ with: 'king', type: 'RIVAL', sinceCycle: 3 }]
    });
    const rivalButLoyal = makeOfficer({
      id: 'steady',
      merit: 0.7,
      mood: { loyalitaet: 45, ambition: 'Möchte stärker werden' },
      relationships: [{ with: 'king', type: 'RIVAL', sinceCycle: 4 }]
    });
    const ally = makeOfficer({ id: 'ally', merit: 0.6 });
    const state = makeState({
      officers: [king, highRisk, lowMerit, rivalButLoyal, ally],
      kingId: king.id
    });
    const result = selectVisibleOfficers(state, {
      ...baseFilters
    });
    // All officers should be visible since filters were removed
    expect(result.map((o) => o.id)).toEqual([
      'king',
      'risk',
      'steady',
      'ally',
      'low'
    ]);
  });
});

describe('lensMaskForFilters', () => {
  it('returns all relation types by default', () => {
    const mask = lensMaskForFilters(baseFilters);
    expect(Array.from(mask).sort()).toEqual([
      'ally',
      'hierarchy',
      'rival'
    ]);
  });

  it.skip('limits mask to friends when friendship filter is active (SKIPPED - friendships removed)', () => {
    // Test skipped because friendships filter was removed with FRIEND relationship type
  });

  it('returns all relation types since filters were removed', () => {
    const mask = lensMaskForFilters({ ...baseFilters });
    expect(Array.from(mask).sort()).toEqual([
      'ally',
      'hierarchy',
      'rival'
    ]);
  });
});

describe('selectVisibleEdges', () => {
  const visibleOfficers = [
    makeOfficer({ id: 'a' }),
    makeOfficer({ id: 'b' }),
    makeOfficer({ id: 'c' })
  ];

  const edges: RelationEdge[] = [
    { id: 'ab', fromId: 'a', toId: 'b', type: 'ally', strength: 0.6 },
    { id: 'bc', fromId: 'b', toId: 'c', type: 'rival', strength: 0.8 },
    { id: 'ad', fromId: 'a', toId: 'd', type: 'ally', strength: 0.4 }
  ];

  it.skip('filters edges by active relation mask (SKIPPED - friendships filter removed)', () => {
    // Test skipped because friendships filter was removed
  });

  it('includes all edges between visible officers since filters were removed', () => {
    const filtered = selectVisibleEdges(visibleOfficers, edges, {
      ...baseFilters
    });
    // Since filters were removed, all edges between visible officers should be included
    expect(filtered).toEqual([edges[0], edges[1]]); // ab and bc edges (ad excluded because d is not visible)
  });
});
