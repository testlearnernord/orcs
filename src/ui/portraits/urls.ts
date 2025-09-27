const BASE = (import.meta as any)?.env?.BASE_URL ?? '/';
const normalizedBase = BASE.endsWith('/') ? BASE : `${BASE}/`;

export const LOCAL_URLS = [
  `${normalizedBase}assets/orcs/portraits/set_a.webp`,
  `${normalizedBase}assets/orcs/portraits/set_b.webp`
];

export const REMOTE_URLS = [
  'https://raw.githubusercontent.com/testlearnernord/orcs/main/docs/assets/orcs/portraits/set_a.webp',
  'https://raw.githubusercontent.com/testlearnernord/orcs/main/docs/assets/orcs/portraits/set_b.webp'
];
