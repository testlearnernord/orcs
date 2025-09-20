export interface SvgPoint {
  x: number;
  y: number;
}

export interface SvgRectPoints {
  tl: SvgPoint;
  tr: SvgPoint;
  bl: SvgPoint;
  br: SvgPoint;
  center: SvgPoint;
}

function toLocalPoint(
  svg: SVGSVGElement,
  matrix: DOMMatrix,
  x: number,
  y: number
): SvgPoint {
  const point = svg.createSVGPoint();
  point.x = x;
  point.y = y;
  const result = point.matrixTransform(matrix);
  return { x: result.x, y: result.y };
}

export function rectToSvgPoints(
  svg: SVGSVGElement,
  element: Element
): SvgRectPoints {
  const rect = element.getBoundingClientRect();
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    const fallback = {
      tl: { x: rect.left, y: rect.top },
      tr: { x: rect.right, y: rect.top },
      bl: { x: rect.left, y: rect.bottom },
      br: { x: rect.right, y: rect.bottom }
    };
    return {
      ...fallback,
      center: {
        x: (fallback.tl.x + fallback.br.x) / 2,
        y: (fallback.tl.y + fallback.br.y) / 2
      }
    };
  }
  const inverse = ctm.inverse();
  const tl = toLocalPoint(svg, inverse, rect.left, rect.top);
  const tr = toLocalPoint(svg, inverse, rect.right, rect.top);
  const bl = toLocalPoint(svg, inverse, rect.left, rect.bottom);
  const br = toLocalPoint(svg, inverse, rect.right, rect.bottom);
  return {
    tl,
    tr,
    bl,
    br,
    center: {
      x: (tl.x + br.x) / 2,
      y: (tl.y + br.y) / 2
    }
  };
}

export function sideAnchors(
  svg: SVGSVGElement,
  from: Element,
  to: Element
): { A: SvgPoint; B: SvgPoint } {
  const A = rectToSvgPoints(svg, from);
  const B = rectToSvgPoints(svg, to);
  const fromRight = A.center.x < B.center.x;
  const start = fromRight
    ? { x: A.tr.x, y: (A.tr.y + A.br.y) / 2 }
    : { x: A.tl.x, y: (A.tl.y + A.bl.y) / 2 };
  const end = fromRight
    ? { x: B.tl.x, y: (B.tl.y + B.bl.y) / 2 }
    : { x: B.tr.x, y: (B.tr.y + B.br.y) / 2 };
  return { A: start, B: end };
}
