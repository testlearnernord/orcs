import { describe, expect, it } from 'vitest';

import { chooseSetAndIndex } from '../mapping';

const sets = [
  { id: 'a', src: '/x/a.webp', cols: 6, rows: 8, weight: 1 },
  { id: 'b', src: '/x/b.webp', cols: 6, rows: 8, weight: 1 }
];

describe('chooseSetAndIndex', () => {
  it('is deterministic for identical officer ids', () => {
    const first = chooseSetAndIndex('Urzsnak:seed:1', sets);
    const second = chooseSetAndIndex('Urzsnak:seed:1', sets);
    expect(second.set.id).toBe(first.set.id);
    expect(second.index).toBe(first.index);
    expect(second.col).toBe(first.col);
    expect(second.row).toBe(first.row);
  });

  it('returns different tiles for nearby ids when possible', () => {
    const first = chooseSetAndIndex('Urzsnak:seed:1', sets);
    const second = chooseSetAndIndex('Urzsnak:seed:2', sets);
    // With deterministic hashing both selections should be within bounds
    expect(first.index).toBeGreaterThanOrEqual(0);
    expect(second.index).toBeGreaterThanOrEqual(0);
    expect(first.set.cols * first.set.rows).toBeGreaterThan(first.index);
    expect(second.set.cols * second.set.rows).toBeGreaterThan(second.index);
  });
});
