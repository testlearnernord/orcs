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
    level: overrides.level ?? 5,
    merit: overrides.merit ?? 0.5,
    traits: overrides.traits ?? [],
    personality:
      overrides.personality ??
      ({
        gier: 0.5,
        tapferkeit: 0.5,
        loyalitaet: 0.5,
        stolz: 0.5
      } as Officer['personality']),
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
  it('keeps only loyal officers while retaining the king', () => {
    const king = makeOfficer({
      id: 'king',
      rank: 'König',
      personality: { gier: 0.2, tapferkeit: 0.6, loyalitaet: 0.9, stolz: 0.5 }
    });
    const loyal = makeOfficer({
      id: 'a',
      personality: { gier: 0.3, tapferkeit: 0.6, loyalitaet: 0.8, stolz: 0.4 }
    });
    const disloyal = makeOfficer({
      id: 'b',
      personality: { gier: 0.4, tapferkeit: 0.6, loyalitaet: 0.4, stolz: 0.4 }
    });
    const state = makeState({
      officers: [king, loyal, disloyal],
      kingId: king.id
    });
    const result = selectVisibleOfficers(state, {
      ...baseFilters,
      loyalToKing: true
    });
    expect(result.map((o) => o.id)).toEqual(['king', 'a']);
  });

  it('filters rivals of the king', () => {
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
      ...baseFilters,
      rivalsOfKing: true
    });
    expect(result.map((o) => o.id)).toEqual(['king', 'r']);
  });

  it('picks promotion candidates per rank', () => {
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
      ...baseFilters,
      promotionCandidates: true
    });
    expect(result.map((o) => o.id)).toEqual(['king', 'c1', 's1']);
  });

  it('identifies coup risks by rivalry, loyalty and merit', () => {
    const king = makeOfficer({ id: 'king', rank: 'König', merit: 0.95 });
    const highRisk = makeOfficer({
      id: 'risk',
      merit: 0.82,
      personality: { gier: 0.4, tapferkeit: 0.6, loyalitaet: 0.2, stolz: 0.5 },
      relationships: [{ with: 'king', type: 'RIVAL', sinceCycle: 2 }]
    });
    const lowMerit = makeOfficer({
      id: 'low',
      merit: 0.4,
      personality: { gier: 0.5, tapferkeit: 0.5, loyalitaet: 0.25, stolz: 0.5 },
      relationships: [{ with: 'king', type: 'RIVAL', sinceCycle: 3 }]
    });
    const rivalButLoyal = makeOfficer({
      id: 'steady',
      merit: 0.7,
      personality: { gier: 0.4, tapferkeit: 0.6, loyalitaet: 0.45, stolz: 0.6 },
      relationships: [{ with: 'king', type: 'RIVAL', sinceCycle: 4 }]
    });
    const ally = makeOfficer({ id: 'ally', merit: 0.6 });
    const state = makeState({
      officers: [king, highRisk, lowMerit, rivalButLoyal, ally],
      kingId: king.id
    });
    const result = selectVisibleOfficers(state, {
      ...baseFilters,
      coupRisk: true
    });
    expect(result.map((o) => o.id)).toEqual(['king', 'risk']);
  });
});

describe('lensMaskForFilters', () => {
  it('returns all relation types by default', () => {
    const mask = lensMaskForFilters(baseFilters);
    expect(Array.from(mask).sort()).toEqual([
      'ally',
      'bloodoath',
      'friend',
      'hierarchy',
      'rival'
    ]);
  });

  it('limits mask to friends when friendship filter is active', () => {
    const mask = lensMaskForFilters({ ...baseFilters, friendships: true });
    expect(Array.from(mask)).toEqual(['friend']);
  });

  it('enables hierarchy focus for loyal-to-king filter', () => {
    const mask = lensMaskForFilters({ ...baseFilters, loyalToKing: true });
    expect(Array.from(mask).sort()).toEqual(['ally', 'hierarchy']);
  });
});

describe('selectVisibleEdges', () => {
  const visibleOfficers = [
    makeOfficer({ id: 'a' }),
    makeOfficer({ id: 'b' }),
    makeOfficer({ id: 'c' })
  ];

  const edges: RelationEdge[] = [
    { id: 'ab', fromId: 'a', toId: 'b', type: 'friend', strength: 0.6 },
    { id: 'bc', fromId: 'b', toId: 'c', type: 'rival', strength: 0.8 },
    { id: 'ad', fromId: 'a', toId: 'd', type: 'ally', strength: 0.4 }
  ];

  it('filters edges by active relation mask', () => {
    const filtered = selectVisibleEdges(visibleOfficers, edges, {
      ...baseFilters,
      friendships: true
    });
    expect(filtered).toEqual([edges[0]]);
  });

  it('excludes edges that point to hidden officers', () => {
    const filtered = selectVisibleEdges(visibleOfficers, edges, {
      ...baseFilters,
      rivalries: true
    });
    expect(filtered).toEqual([edges[1]]);
  });
});
