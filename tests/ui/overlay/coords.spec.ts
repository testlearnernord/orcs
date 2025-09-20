import { describe, expect, it } from 'vitest';

import { centerOf, rectRelativeTo } from '@ui/overlay/domCoords';

describe('domCoords', () => {
  it('computes rectangle relative to a given root element', () => {
    const root = document.createElement('div');
    Object.defineProperty(root, 'getBoundingClientRect', {
      value: () => ({
        left: 100,
        top: 200,
        right: 400,
        bottom: 600,
        width: 300,
        height: 400,
        x: 100,
        y: 200
      }),
      configurable: true
    });

    const child = document.createElement('div');
    Object.defineProperty(child, 'getBoundingClientRect', {
      value: () => ({
        left: 150,
        top: 260,
        right: 200,
        bottom: 330,
        width: 50,
        height: 70,
        x: 150,
        y: 260
      }),
      configurable: true
    });

    const rect = rectRelativeTo(child, root);
    expect(rect).toEqual({ x: 50, y: 60, w: 50, h: 70 });
  });

  it('falls back to the document element when no root is provided', () => {
    const original = document.documentElement.getBoundingClientRect;
    Object.defineProperty(document.documentElement, 'getBoundingClientRect', {
      value: () => ({
        left: 12,
        top: 24,
        right: 812,
        bottom: 624,
        width: 800,
        height: 600,
        x: 12,
        y: 24
      }),
      configurable: true
    });

    const node = document.createElement('div');
    Object.defineProperty(node, 'getBoundingClientRect', {
      value: () => ({
        left: 112,
        top: 224,
        right: 152,
        bottom: 264,
        width: 40,
        height: 40,
        x: 112,
        y: 224
      }),
      configurable: true
    });

    const rect = rectRelativeTo(node, null);
    expect(rect).toEqual({ x: 100, y: 200, w: 40, h: 40 });
    const center = centerOf(node, null);
    expect(center).toEqual({ x: 120, y: 220 });

    Object.defineProperty(document.documentElement, 'getBoundingClientRect', {
      value: original,
      configurable: true
    });
  });
});
