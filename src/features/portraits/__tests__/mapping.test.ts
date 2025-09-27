import { describe, expect, it } from 'vitest';

import { portraitIndexFor } from '@/ui/portraits/indexFor';

describe('portraitIndexFor', () => {
  it('is deterministic for identical officer ids', () => {
    const first = portraitIndexFor('Urzsnak:seed:1', 48);
    const second = portraitIndexFor('Urzsnak:seed:1', 48);
    expect(second).toBe(first);
  });

  it('spreads nearby ids across available tiles', () => {
    const total = 48;
    const first = portraitIndexFor('Urzsnak:seed:1', total);
    const second = portraitIndexFor('Urzsnak:seed:2', total);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(second).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(total);
    expect(second).toBeLessThan(total);
  });
});
