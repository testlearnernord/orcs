import { sideAnchors, type SvgPoint } from '@ui/overlay/coords';

export type AnchorPoint = SvgPoint;

export function edgeAnchors(
  svg: SVGSVGElement,
  from: Element,
  to: Element
): { A: AnchorPoint; B: AnchorPoint } {
  return sideAnchors(svg, from, to);
}

export function bezierD(A: AnchorPoint, B: AnchorPoint): string {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const c1 = { x: A.x + dx * 0.25, y: A.y + dy * 0.15 };
  const c2 = { x: A.x + dx * 0.75, y: A.y + dy * 0.85 };
  return `M ${A.x} ${A.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${B.x} ${B.y}`;
}
