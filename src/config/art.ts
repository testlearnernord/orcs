export type ArtSet = 'realistic' | 'legacy';

function getInitialArt(): ArtSet {
  try {
    const raw = localStorage.getItem('art.active');
    return raw === 'legacy' ? 'legacy' : 'realistic';
  } catch {
    return 'realistic';
  }
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
