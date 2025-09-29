import { describe, expect, it } from 'vitest';

import type { WarcallPlan, WorldState } from '@sim/types';
import {
  phaseOf,
  selectWarcallsByStatus,
  statusOf,
  withPhase
} from '@state/selectors/warcalls';

describe('warcall selectors', () => {
  const basePlan: WarcallPlan = {
    id: 'w1',
    cycleAnnounced: 2,
    resolveOn: 5,
    initiator: 'o1',
    participants: ['o1', 'o2'],
    location: 'Schädelhügel',
    baseDifficulty: 0.5,
    kind: 'Duel',
    risk: 0.2
  };

  it('derives phases relative to the current cycle', () => {
    expect(phaseOf(basePlan, 3)).toBe('START');
    expect(phaseOf({ ...basePlan, resolveOn: 4 }, 3)).toBe('START');
    expect(phaseOf({ ...basePlan, resolveOn: 2 }, 3)).toBe('ENDE');
  });

  it('assigns statuses based on phase and participant availability', () => {
    expect(statusOf({ phase: 'ENDE', participants: [] })).toBe('done');
    expect(statusOf({ phase: 'START', participants: [] })).toBe('pending');
    expect(statusOf({ phase: 'START', participants: ['x'] })).toBe('active');
  });

  it('filters warcalls by derived status', () => {
    const state: WorldState = {
      seed: 'test',
      cycle: 3,
      officers: [],
      graveyard: [],
      warcalls: [
        basePlan,
        { ...basePlan, id: 'w2', participants: [] },
        { ...basePlan, id: 'w3', resolveOn: 2 }
      ],
      kingId: 'king',
      kingStatus: 'GEFESTIGT',
      kingStatusExpires: 0,
      feed: [],
      playerId: null,
      crown: {
        reignCycles: 0,
        crownPressure: 0,
        tributeRate: 0.1,
        instability: 'stable'
      }
    };

    const pending = selectWarcallsByStatus(state, 'pending');
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('w2');
    expect(pending[0].phase).toBe('START');

    const active = selectWarcallsByStatus(state, 'active');
    expect(active.map((plan) => plan.id)).toEqual(['w1']);

    const resolved = withPhase({ ...basePlan, resolveOn: 2 }, state.cycle);
    expect(resolved.phase).toBe('ENDE');
    expect(statusOf(resolved)).toBe('done');
  });
});
