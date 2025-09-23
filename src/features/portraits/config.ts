const rawBase = (import.meta as any)?.env?.BASE_URL ?? '/';
const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export const BASE_URL: string = normalizedBase;

export const PORTRAIT_ATLASES = [
  `${BASE_URL}assets/orcs/portraits/set_a.webp`,
  `${BASE_URL}assets/orcs/portraits/set_b.webp`
];
