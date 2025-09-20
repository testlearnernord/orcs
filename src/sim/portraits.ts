import catalog from '@assets/orc/generated/orc_catalog.json';

interface CatalogEntry {
  seed: string;
  data: string;
}

function isCatalogEntry(value: unknown): value is CatalogEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<CatalogEntry>;
  return typeof entry.seed === 'string' && typeof entry.data === 'string';
}

const RAW_CATALOG: unknown = catalog;
const CATALOG: readonly CatalogEntry[] = Array.isArray(RAW_CATALOG)
  ? RAW_CATALOG.filter(isCatalogEntry)
  : [];
const DATA_PREFIX = 'data:image/png;base64,';
const FALLBACK_ENTRY = CATALOG[0];

function findCatalogEntry(seed: string): CatalogEntry | undefined {
  return CATALOG.find((entry) => entry.seed === seed);
}

function toDataUrl(entry: CatalogEntry | undefined): string {
  return entry ? `${DATA_PREFIX}${entry.data}` : '';
}

export function getPortraitSeed(id: string): string {
  if (CATALOG.length === 0) return 'default';
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = (hash >>> 0) % CATALOG.length;
  return CATALOG[index]?.seed ?? FALLBACK_ENTRY?.seed ?? 'default';
}

export function getLegacyPortraitUrl(seed: string): string {
  if (CATALOG.length === 0) return '';
  const entry = findCatalogEntry(seed) ?? FALLBACK_ENTRY;
  return toDataUrl(entry);
}

export function getPortraitAsset(seed: string): string {
  if (CATALOG.length === 0) return '';
  return getLegacyPortraitUrl(seed);
}
