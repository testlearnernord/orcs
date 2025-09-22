function withBase(p: string) {
  const base = (import.meta as any)?.env?.BASE_URL ?? '/';
  try {
    return new URL(p, base).toString();
  } catch {
    const origin = (globalThis as any)?.location?.origin ?? 'http://localhost/';
    const absoluteBase = new URL(base, origin).toString();
    return new URL(p, absoluteBase).toString();
  }
}

export async function preloadPortraitSheets() {
  if (typeof window === 'undefined') return;
  try {
    const url = withBase('assets/orcs/portraits/manifest.json');
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return;
    const { sets } = (await res.json()) as { sets?: Array<{ src: string }> };
    if (!Array.isArray(sets)) return;
    for (const s of sets) {
      if (!s?.src) continue;
      const img = new Image();
      img.decoding = 'async';
      (img as any).loading = 'eager';
      img.src = withBase(s.src);
    }
  } catch {
    /* ignore */
  }
}
