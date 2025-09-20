import { describe, expect, it } from 'vitest';

import { bezierD, edgeAnchors } from '@ui/overlay/anchors';

describe('overlay anchors', () => {
  const rect = (
    left: number,
    top: number,
    width: number,
    height: number
  ): DOMRect =>
    ({
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      x: left,
      y: top,
      toJSON() {
        return {};
      }
    }) as DOMRect;

  it('anchors from the right edge when target is to the right', () => {
    const a = rect(100, 200, 80, 60);
    const b = rect(240, 210, 60, 60);
    const root = rect(0, 0, 800, 600);

    const { A, B } = edgeAnchors(a, b, root);
    expect(A).toEqual({
      x: a.right - root.left,
      y: a.top + a.height / 2 - root.top
    });
    expect(B).toEqual({
      x: b.left - root.left,
      y: b.top + b.height / 2 - root.top
    });
  });

  it('anchors from the left edge when target is to the left', () => {
    const a = rect(300, 180, 70, 70);
    const b = rect(180, 200, 60, 60);
    const root = rect(50, 40, 900, 700);

    const { A, B } = edgeAnchors(a, b, root);
    expect(A).toEqual({
      x: a.left - root.left,
      y: a.top + a.height / 2 - root.top
    });
    expect(B).toEqual({
      x: b.right - root.left,
      y: b.top + b.height / 2 - root.top
    });
  });

  it('produces a smooth bezier path between anchors', () => {
    const start = { x: 10, y: 10 };
    const end = { x: 110, y: 40 };
    const path = bezierD(start, end);

    expect(path.startsWith('M 10 10 C ')).toBe(true);
    const numbers = path
      .replace('M ', '')
      .replace(/C /, '')
      .split(',')
      .join(' ')
      .split(' ')
      .map((value) => Number.parseFloat(value))
      .filter((value) => !Number.isNaN(value));

    expect(numbers[0]).toBe(start.x);
    expect(numbers[1]).toBe(start.y);
    expect(numbers[numbers.length - 2]).toBe(end.x);
    expect(numbers[numbers.length - 1]).toBe(end.y);
    expect(numbers[2]).toBeGreaterThan(start.x);
    expect(numbers[4]).toBeGreaterThan(numbers[2]);
  });
});
