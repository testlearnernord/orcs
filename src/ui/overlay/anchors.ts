export interface AnchorPoint {
  x: number;
  y: number;
}

export function edgeAnchors(
  a: DOMRect,
  b: DOMRect,
  root: DOMRect
): {
  A: AnchorPoint;
  B: AnchorPoint;
} {
  const ax = a.right < b.left ? a.right : a.left;
  const bx = a.right < b.left ? b.left : b.right;
  const ay = a.top + a.height / 2;
  const by = b.top + b.height / 2;
  return {
    A: { x: ax - root.left, y: ay - root.top },
    B: { x: bx - root.left, y: by - root.top }
  };
}

export function bezierD(A: AnchorPoint, B: AnchorPoint): string {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const c1 = { x: A.x + dx * 0.25, y: A.y + dy * 0.15 };
  const c2 = { x: A.x + dx * 0.75, y: A.y + dy * 0.85 };
  return `M ${A.x} ${A.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${B.x} ${B.y}`;
}
