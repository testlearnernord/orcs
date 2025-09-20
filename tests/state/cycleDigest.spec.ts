import { describe, expect, it } from 'vitest';

import type { CycleSummary, Officer, WorldState } from '@sim/types';
import { computeDigest } from '@state/cycleDigest';

const basePersonality = {
  gier: 0.1,
  tapferkeit: 0.4,
  loyalitaet: 0.3,
  stolz: 0.2
};

function createOfficer(
  partial: Partial<Officer> & {
    id: string;
    name: string;
    rank: Officer['rank'];
  }
): Officer {
  return {
    level: 1,
    merit: 10,
    traits: [],
    relationships: [],
    portraitSeed: 'seed',
    status: 'ALIVE',
    cycleJoined: 0,
    memories: [],
    personality: { ...basePersonality },
    ...partial
  };
}

describe('computeDigest', () => {
  it('orders highlights by score and includes key events', () => {
    const prev: WorldState = {
      seed: 'seed',
      cycle: 4,
      officers: [
        createOfficer({ id: 'o1', name: 'Gor', rank: 'Späher' }),
        createOfficer({ id: 'p1', name: 'Boss', rank: 'Spieler' }),
        createOfficer({ id: 'o2', name: 'Harg', rank: 'Captain' })
      ],
      graveyard: [],
      warcalls: [],
      kingId: 'p1',
      kingStatus: 'GEFESTIGT',
      kingStatusExpires: 0,
      feed: []
    };

    const spawn = createOfficer({ id: 'o3', name: 'Nura', rank: 'Grunzer' });

    const next: WorldState = {
      seed: 'seed',
      cycle: 5,
      officers: [
        {
          ...createOfficer({ id: 'o1', name: 'Gor', rank: 'Captain' }),
          relationships: [{ with: 'o3', type: 'BLOOD_OATH', sinceCycle: 5 }]
        },
        createOfficer({ id: 'p1', name: 'Boss', rank: 'Spieler' }),
        {
          ...spawn,
          relationships: [{ with: 'o1', type: 'BLOOD_OATH', sinceCycle: 5 }]
        }
      ],
      graveyard: [
        {
          ...createOfficer({ id: 'o2', name: 'Harg', rank: 'Captain' }),
          status: 'DEAD',
          cycleDied: 5
        }
      ],
      warcalls: [],
      kingId: 'p1',
      kingStatus: 'GEFESTIGT',
      kingStatusExpires: 0,
      feed: []
    };

    const summary: CycleSummary = {
      cycle: 5,
      warcallsResolved: [
        {
          warcall: {
            id: 'w1',
            cycleAnnounced: 4,
            resolveOn: 5,
            initiator: 'p1',
            participants: ['p1', 'o1'],
            location: 'Arena',
            baseDifficulty: 0.3,
            kind: 'Duel',
            risk: 0.1
          },
          success: true,
          casualties: [],
          feed: []
        }
      ],
      warcallsPlanned: [],
      deaths: ['o2'],
      spawns: [spawn],
      promotions: [{ officerId: 'o1', from: 'Späher', to: 'Captain' }],
      feed: []
    };

    const highlights = computeDigest(prev, next, summary);
    expect(highlights.length).toBeGreaterThanOrEqual(4);
    expect(highlights[0].label).toContain('Gor');
    expect(highlights[0].label).toContain('steigt');
    expect(highlights[0].score).toBeGreaterThanOrEqual(highlights[1].score);
    const labels = highlights.map((entry) => entry.label);
    expect(labels.some((label) => label.includes('Blutschwur'))).toBe(true);
    expect(labels.some((label) => label.includes('verstärkt'))).toBe(true);
    expect(labels.some((label) => label.includes('triumphiert'))).toBe(true);
  });
});
