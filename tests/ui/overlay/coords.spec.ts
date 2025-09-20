import { describe, expect, it } from 'vitest';

import { rectToSvgPoints, sideAnchors } from '@ui/overlay/coords';

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

function createSvg(matrix: MockMatrix | null): SVGSVGElement {
  return {
    createSVGPoint: () => new MockPoint(),
    getScreenCTM: () => matrix as unknown as DOMMatrix | null
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

describe('overlay coords', () => {
  it('maps DOM rects into svg space with scaling and translation', () => {
    const svg = createSvg(new MockMatrix(2, 0, 0, 2, 100, 50));
    const element = createElement({
      left: 140,
      top: 90,
      right: 260,
      bottom: 150,
      width: 120,
      height: 60
    });

    const points = rectToSvgPoints(svg, element);
    expect(points.tl.x).toBeCloseTo(20);
    expect(points.tl.y).toBeCloseTo(20);
    expect(points.br.x).toBeCloseTo(80);
    expect(points.br.y).toBeCloseTo(50);
    expect(points.center.x).toBeCloseTo((20 + 80) / 2);
    expect(points.center.y).toBeCloseTo((20 + 50) / 2);
  });

  it('falls back to screen space when no CTM is available', () => {
    const svg = createSvg(null);
    const element = createElement({
      left: 40,
      top: 60,
      right: 100,
      bottom: 120,
      width: 60,
      height: 60
    });

    const points = rectToSvgPoints(svg, element);
    expect(points.tl.x).toBe(40);
    expect(points.tr.x).toBe(100);
    expect(points.center.y).toBe(90);
  });

  it('selects side anchors based on relative positions', () => {
    const svg = createSvg(new MockMatrix(1, 0, 0, 1, 0, 0));
    const from = createElement({
      left: 10,
      top: 10,
      right: 60,
      bottom: 60,
      width: 50,
      height: 50
    });
    const to = createElement({
      left: 120,
      top: 20,
      right: 170,
      bottom: 80,
      width: 50,
      height: 60
    });

    const anchors = sideAnchors(svg, from, to);
    expect(anchors.A.x).toBeCloseTo(60);
    expect(anchors.A.y).toBeCloseTo(35);
    expect(anchors.B.x).toBeCloseTo(120);
    expect(anchors.B.y).toBeCloseTo(50);
  });
});
