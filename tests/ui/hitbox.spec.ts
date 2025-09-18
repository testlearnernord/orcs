import { describe, expect, it } from 'vitest';

import type { Officer } from '@sim/types';
import { OfficerToken } from '@ui/components/officerToken';

const officer: Officer = {
  id: 'o1',
  name: 'Gor',
  rank: 'Captain',
  level: 5,
  merit: 120,
  traits: ['Berserker'],
  personality: { gier: 0.2, tapferkeit: 0.8, loyalitaet: 0.6, stolz: 0.4 },
  relationships: [],
  portraitSeed: 'seed',
  status: 'ALIVE',
  cycleJoined: 0,
  memories: []
};

describe('OfficerToken', () => {
  it('uses a circular hit area for interactions', () => {
    const token = new OfficerToken(officer, 42);
    expect(token.hitArea).toBeDefined();
    expect(token.hitArea?.radius).toBe(42);
    expect(token.isPointInside(0, 0)).toBe(true);
    expect(token.isPointInside(50, 50)).toBe(false);
  });

  it('exposes trait badges', () => {
    const token = new OfficerToken(officer, 30);
    expect(token.badges).toEqual(['Berserker']);
  });
});
