import catalog from '@assets/orc/generated/orc_catalog.json';

interface CatalogEntry {
  seed: string;
  data: string;
}
const CATALOG: CatalogEntry[] = catalog as CatalogEntry[];
const DATA_PREFIX = 'data:image/png;base64,';

export function getPortraitSeed(id: string): string {
  if (CATALOG.length === 0) return 'default';
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return CATALOG[(hash >>> 0) % CATALOG.length].seed;
}

export function getPortraitAsset(seed: string): string {
  if (CATALOG.length === 0) return '';
  const match = CATALOG.find((e) => e.seed === seed) ?? CATALOG[0];
  return `${DATA_PREFIX}${match.data}`;
}
