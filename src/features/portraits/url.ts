export function resolveWithBase(path: string): string {
  const base = (import.meta as any)?.env?.BASE_URL ?? '/';
  const a = base.endsWith('/') ? base.slice(0, -1) : base;
  const b = path.startsWith('/') ? path.slice(1) : path;
  // ergibt z. B. "/orcs/assets/orcs/portraits/set_a.webp"
  return `${a}/${b}`;
}
