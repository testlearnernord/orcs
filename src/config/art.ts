const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

const DEFAULT_PORTRAITS_VERSION = '20250215';

export const PORTRAIT_ATLASES = ['set_a.webp', 'set_b.webp'] as const;

export type PortraitAtlases = typeof PORTRAIT_ATLASES;
export type AtlasFile = PortraitAtlases[number];

export type PortraitArtConfig = {
  base: string;
  atlases: PortraitAtlases;
  version: string;
};

export function normalizeBaseUrl(value: string | undefined): string {
  const raw = value ?? '/';
  if (ABSOLUTE_URL_PATTERN.test(raw)) {
    return raw.endsWith('/') ? raw : `${raw}/`;
  }
  const prefixed = raw.startsWith('/') ? raw : `/${raw}`;
  return prefixed.endsWith('/') ? prefixed : `${prefixed}/`;
}

export function resolvePortraitVersion(
  raw: unknown,
  fallback: string = DEFAULT_PORTRAITS_VERSION
): string {
  const explicit = typeof raw === 'string' ? raw.trim() : '';
  if (explicit) return explicit;
  const buildStamp =
    typeof __BUILD_TIME__ !== 'undefined' ? String(__BUILD_TIME__).trim() : '';
  return buildStamp || fallback;
}

function createPortraitConfig(): PortraitArtConfig {
  const base = `${normalizeBaseUrl(import.meta.env.BASE_URL)}assets/orcs/portraits/`;
  const version = resolvePortraitVersion(
    import.meta.env.VITE_PORTRAITS_VERSION
  );
  return { base, atlases: PORTRAIT_ATLASES, version };
}

export const ArtConfig: PortraitArtConfig = createPortraitConfig();

export function getAtlasUrl(file: AtlasFile): string {
  const suffix = ArtConfig.version
    ? `?v=${encodeURIComponent(ArtConfig.version)}`
    : '';
  return `${ArtConfig.base}${file}${suffix}`;
}
