export type ArtSet = 'realistic';

function getInitialArt(): ArtSet {
  if (typeof localStorage === 'undefined') return 'realistic';
  try {
    const raw = localStorage.getItem('art.active');
    if (raw === 'legacy') localStorage.removeItem('art.active');
  } catch {
    /* ignore */
  }
  return 'realistic';
}

export const ArtConfig = {
  active: getInitialArt(),
  base: new URL('assets/orcs/portraits/', import.meta.env.BASE_URL).toString(),
  atlases: ['set_a.webp', 'set_b.webp'] as const
} as const;

export function setArtMode(mode: ArtSet) {
  try {
    localStorage.setItem('art.active', mode);
  } catch {
    /* ignore */
  }
  (ArtConfig as any).active = mode;
}
