import { describe, expect, it } from 'vitest';

import { GraveyardPanel } from '../../src/ui/components/graveyard';
import type { Officer } from '../../src/sim/types';

function createOfficer(id: string, cycle: number): Officer {
  return {
    id,
    name: `Orc ${id}`,
    rank: 'Grunzer',
    level: 1,
    merit: 0,
    traits: [],
    personality: { gier: 0, tapferkeit: 0, loyalitaet: 0, stolz: 0 },
    relationships: [],
    portraitSeed: id,
    status: 'DEAD',
    cycleJoined: 0,
    cycleDied: cycle,
    memories: []
  };
}

describe('GraveyardPanel', () => {
  it('supports scrolling within bounds', () => {
    const officers = Array.from({ length: 12 }, (_, index) =>
      createOfficer(`o${index}`, index)
    );
    const panel = new GraveyardPanel(officers, {
      rowHeight: 24,
      viewHeight: 72
    });

    expect(panel.scrollOffset).toBe(0);
    panel.scroll(30);
    expect(panel.scrollOffset).toBe(30);
    panel.scroll(10_000);
    expect(panel.scrollOffset).toBe(panel.maxScroll);
  });

  it('can be closed', () => {
    const officers = [createOfficer('o1', 1)];
    const panel = new GraveyardPanel(officers);
    expect(panel.isOpen).toBe(true);
    panel.close();
    expect(panel.isOpen).toBe(false);
  });
});
