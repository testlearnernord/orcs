function detectBase(): string {
  // 1) Vite-Base, zur Buildzeit ersetzt
  const viteBase = (import.meta as any)?.env?.BASE_URL ?? '/';
  if (viteBase && viteBase !== '/')
    return viteBase.endsWith('/') ? viteBase : viteBase + '/';

  // 2) Fallback: GitHub Pages Projektpfad aus Location ziehen ("/orcs/")
  try {
    const seg = (window.location.pathname || '/').split('/').filter(Boolean)[0];
    return seg ? `/${seg}/` : '/';
  } catch {
    return '/';
  }
}

export function resolveWithBase(path: string): string {
  const base = detectBase();
  const a = base.endsWith('/') ? base.slice(0, -1) : base;
  const b = path.startsWith('/') ? path.slice(1) : path;
  return `${a}/${b}`;
}
