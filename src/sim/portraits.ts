const DATA_PREFIX = 'data:image/png;base64,';

interface LegacyResolver {
  (seed: string): string | undefined;
}

declare global {
  interface Window {
    __LEGACY_ORC_PORTRAIT__?: LegacyResolver;
  }
}

export function getPortraitSeed(id: string): string {
  if (!id) return 'default';
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return `seed_${hash >>> 0}`;
}

export function getLegacyPortraitUrl(seed: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const resolver = (
    window as Window & {
      __LEGACY_ORC_PORTRAIT__?: LegacyResolver;
    }
  ).__LEGACY_ORC_PORTRAIT__;
  const value = resolver?.(seed);
  if (!value) return undefined;
  return value.startsWith('data:') ? value : `${DATA_PREFIX}${value}`;
}

export function getPortraitAsset(seed: string): string {
  return getLegacyPortraitUrl(seed) ?? '';
}
