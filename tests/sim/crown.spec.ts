import { describe, expect, it } from 'vitest';

import { updateCrownState, computeReignPressure } from '@sim/crown';
import type { CrownState, FeedEntry, Officer, WorldState } from '@sim/types';
import { RNG } from '@sim/rng';

function officer(
  partial: Partial<Officer> & {
    id: string;
    name: string;
    rank: Officer['rank'];
  }
): Officer {
  return {
    merit: 40,
    traits: [],
    relationships: [],
    status: 'ALIVE',
    cycleJoined: 0,
    memories: [],
    stats: {
      potential: 'Normal',
      level: 5,
      hp: 100,
      maxHp: 100,
      str: 50,
      dex: 50,
      int: 50
    },
    mood: {
      loyalitaet: partial.rank === 'König' ? undefined : 40,
      ambition: 'Möchte stärker werden'
    },
    stableId: partial.stableId ?? partial.id,
    ...partial
  };
}

describe('crown systems', () => {
  it('increases crown pressure faster during crisis', () => {
    const crown: CrownState = {
      reignCycles: 30,
      crownPressure: 0.32,
      tributeRate: 0.15,
      instability: 'stable'
    };
    const stable = computeReignPressure(crown, 'stable', false);
    const shaky = computeReignPressure(crown, 'shaky', false);
    const crisis = computeReignPressure(crown, 'crisis', false);
    expect(crisis - crown.crownPressure).toBeGreaterThan(
      stable - crown.crownPressure
    );
    expect(crisis - crown.crownPressure).toBeGreaterThan(
      shaky - crown.crownPressure
    );
  });

  it('triggers a throne battle when pressure is high', () => {
    const king = officer({
      id: 'king',
      name: 'Throner',
      rank: 'König',
      personality: { gier: 0.2, tapferkeit: 0.6, loyalitaet: 0.45, stolz: 0.5 }
    });
    const rival = officer({
      id: 'r1',
      name: 'Rauk',
      rank: 'Captain',
      mood: { loyalitaet: 10, ambition: 'Möchte König werden' },
      relationships: [{ with: 'king', type: 'RIVAL', sinceCycle: 10 }]
    });
    const supporter = officer({
      id: 'r2',
      name: 'Snegg',
      rank: 'Späher',
      mood: { loyalitaet: 18, ambition: 'Möchte dem König dienen' }
    });

    const state: WorldState = {
      seed: 'crown-test',
      cycle: 40,
      officers: [king, rival, supporter],
      graveyard: [],
      warcalls: [],
      kingId: 'king',
      kingStatus: 'GEFESTIGT',
      kingStatusExpires: 0,
      feed: [],
      playerId: null,
      crown: {
        reignCycles: 45,
        crownPressure: 0.82,
        tributeRate: 0.2,
        instability: 'crisis'
      }
    };

    const rng = new RNG('throne');
    const feed: FeedEntry[] = [];
    const result = updateCrownState(state, rng, feed);
    expect(result.resolution).toBeDefined();
    expect(result.resolution?.warcall.kind).toBe('Thronschlacht');
    expect(result.casualties.length).toBeGreaterThan(0);
    expect(state.crown.crownPressure).toBeLessThanOrEqual(0.82);
  });
});
