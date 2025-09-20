import { describe, expect, it, beforeEach } from 'vitest';

import { flip } from '@ui/utils/flip';

describe('flip utility', () => {
  beforeEach(() => {
    // @ts-expect-error override animate for tests
    HTMLElement.prototype.animate = function () {
      return {
        addEventListener: () => {}
      } as unknown as Animation;
    };
  });

  it('computes animation based on rect delta', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const first = new DOMRect(0, 0, 100, 40);
    const rect = new DOMRect(40, 20, 100, 40);
    // @ts-expect-error override for test
    el.getBoundingClientRect = () => rect;
    let called = false;
    // @ts-expect-error override animate
    el.animate = () => {
      called = true;
      return {
        addEventListener: () => {}
      } as unknown as Animation;
    };
    flip(el, first);
    expect(called).toBe(true);
  });
});
