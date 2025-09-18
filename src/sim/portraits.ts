import catalog from '../assets/orc/generated/orc_catalog.json';

interface CatalogEntry {
  seed: string;
  data: string;
}

const CATALOG: CatalogEntry[] = catalog as CatalogEntry[];

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

export function getPortraitSeed(id: string): string {
  if (CATALOG.length === 0) {
    return 'default';
  }
  const index = hashId(id) % CATALOG.length;
  return CATALOG[index].seed;
}

const DATA_PREFIX = 'data:image/png;base64,';

export function getPortraitAsset(seed: string): string {
  if (CATALOG.length === 0) {
    return '';
  }
  const match = CATALOG.find((entry) => entry.seed === seed);
  const target = match ?? CATALOG[0];
  return `${DATA_PREFIX}${target.data}`;
}

export function getCatalog(): CatalogEntry[] {
  return [...CATALOG];
}
