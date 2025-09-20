export type ArtSet = 'realistic' | 'legacy';

const baseUrl =
  typeof import.meta !== 'undefined'
    ? ((import.meta as unknown as { env?: { BASE_URL?: string } }).env
        ?.BASE_URL ?? '/')
    : '/';

export const ArtConfig = {
  active: 'realistic' as ArtSet,
  base: new URL('assets/orcs/portraits/', baseUrl).toString(),
  atlases: ['set_a.webp', 'set_b.webp'] as const
} as const;

export type ArtAtlasFile = (typeof ArtConfig.atlases)[number];
