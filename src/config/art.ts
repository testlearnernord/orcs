export type ArtSet = 'realistic' | 'legacy';

export const ArtConfig = {
  active: 'realistic' as ArtSet,
  base: new URL('assets/orcs/portraits/', import.meta.env.BASE_URL).toString(),
  atlases: ['set_a.webp', 'set_b.webp'] as const
} as const;
