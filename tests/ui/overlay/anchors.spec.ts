import { describe, expect, it } from 'vitest';

import { bezierD, edgeAnchors } from '@ui/overlay/anchors';

class MockMatrix {
  constructor(
    public readonly a: number,
    public readonly b: number,
    public readonly c: number,
    public readonly d: number,
    public readonly e: number,
    public readonly f: number
  ) {}

  inverse(): MockMatrix {
    const det = this.a * this.d - this.b * this.c;
    const a = this.d / det;
    const b = -this.b / det;
    const c = -this.c / det;
    const d = this.a / det;
    const e = (this.c * this.f - this.d * this.e) / det;
    const f = (this.b * this.e - this.a * this.f) / det;
    return new MockMatrix(a, b, c, d, e, f);
  }
}

class MockPoint {
  x = 0;
  y = 0;

  matrixTransform(matrix: MockMatrix): { x: number; y: number } {
    return {
      x: matrix.a * this.x + matrix.c * this.y + matrix.e,
      y: matrix.b * this.x + matrix.d * this.y + matrix.f
    };
  }
}

function createSvg(matrix: MockMatrix): SVGSVGElement {
  return {
    createSVGPoint: () => new MockPoint(),
    getScreenCTM: () => matrix as unknown as DOMMatrix
  } as unknown as SVGSVGElement;
}

function createElement(rect: {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}): Element {
  return {
    getBoundingClientRect: () => rect
  } as unknown as Element;
}

describe('overlay anchors', () => {
  it('anchors from the right edge when target is to the right', () => {
    const svg = createSvg(new MockMatrix(1, 0, 0, 1, 0, 0));
    const source = createElement({
      left: 100,
      top: 200,
      right: 180,
      bottom: 260,
      width: 80,
      height: 60
    });
    const target = createElement({
      left: 240,
      top: 210,
      right: 300,
      bottom: 270,
      width: 60,
      height: 60
    });

    const { A, B } = edgeAnchors(svg, source, target);
    expect(A.x).toBeCloseTo(180);
    expect(A.y).toBeCloseTo(230);
    expect(B.x).toBeCloseTo(240);
    expect(B.y).toBeCloseTo(240);
  });

  it('anchors from the left edge when target is to the left', () => {
    const svg = createSvg(new MockMatrix(1, 0, 0, 1, 0, 0));
    const source = createElement({
      left: 320,
      top: 180,
      right: 390,
      bottom: 250,
      width: 70,
      height: 70
    });
    const target = createElement({
      left: 180,
      top: 200,
      right: 240,
      bottom: 260,
      width: 60,
      height: 60
    });

    const { A, B } = edgeAnchors(svg, source, target);
    expect(A.x).toBeCloseTo(320);
    expect(A.y).toBeCloseTo(215);
    expect(B.x).toBeCloseTo(240);
    expect(B.y).toBeCloseTo(230);
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
