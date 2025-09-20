export interface FlipConfig extends KeyframeAnimationOptions {}

const DEFAULT_OPTIONS: FlipConfig = {
  duration: 220,
  easing: 'cubic-bezier(.2,.8,.2,1)',
  fill: 'both'
};

export function measure(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect();
}

export function flip(
  element: HTMLElement,
  firstRect?: DOMRect,
  options: FlipConfig = DEFAULT_OPTIONS
): Animation | undefined {
  const start = firstRect ?? element.getBoundingClientRect();
  const end = element.getBoundingClientRect();
  const dx = start.left - end.left;
  const dy = start.top - end.top;
  const sx = start.width === 0 ? 1 : start.width / Math.max(end.width, 1);
  const sy = start.height === 0 ? 1 : start.height / Math.max(end.height, 1);
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(1 - sx) < 0.01) {
    return undefined;
  }
  const keyframes: Keyframe[] = [
    {
      transformOrigin: 'top left',
      transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
      opacity: 0.9
    },
    {
      transformOrigin: 'top left',
      transform: 'translate(0, 0) scale(1, 1)',
      opacity: 1
    }
  ];
  const animate = (el: HTMLElement) => {
    if (typeof el.animate !== 'function') {
      el.style.transition = 'transform 0.22s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transform = 'translate(0, 0)';
      });
      return undefined;
    }
    return el.animate(keyframes, { ...DEFAULT_OPTIONS, ...options });
  };
  return animate(element);
}
