export interface RelativeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function toDOMRect(rect: DOMRect | DOMRectReadOnly): DOMRect {
  if (typeof DOMRect === 'function' && !(rect instanceof DOMRect)) {
    return new DOMRect(rect.x, rect.y, rect.width, rect.height);
  }
  return rect as DOMRect;
}

export function rectRelativeTo(
  el: Element,
  root: Element | null
): RelativeRect {
  const elementRect = toDOMRect(el.getBoundingClientRect());
  const reference = root ?? document.documentElement;
  const referenceRect = toDOMRect(reference.getBoundingClientRect());
  return {
    x: elementRect.left - referenceRect.left,
    y: elementRect.top - referenceRect.top,
    w: elementRect.width,
    h: elementRect.height
  };
}

export function centerOf(
  el: Element,
  root: Element | null
): { x: number; y: number } {
  const rect = rectRelativeTo(el, root);
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2
  };
}
