import { ArtConfig } from '../../config/art';

export interface AtlasInfo {
  url: string;
  cols: number;
  rows: number;
  tile: number;
  count: number;
}

export interface AtlasBundle {
  atlases: AtlasInfo[];
  totalTiles: number;
}

const GRID_PREFERENCES: Array<[number, number]> = [
  [6, 4],
  [5, 5],
  [4, 6],
  [6, 5],
  [5, 6],
  [8, 4],
  [4, 8]
];

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function sniffGrid(width: number, height: number): {
  cols: number;
  rows: number;
  tile: number;
} {
  for (const [cols, rows] of GRID_PREFERENCES) {
    if (width % cols === 0 && height % rows === 0) {
      const tile = Math.min(width / cols, height / rows);
      if (tile >= 96 && tile <= 512) {
        return { cols, rows, tile };
      }
    }
  }
  const tile = Math.max(64, Math.min(512, gcd(width, height)));
  return {
    cols: Math.max(1, Math.round(width / tile)),
    rows: Math.max(1, Math.round(height / tile)),
    tile
  };
}

async function head(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

let cachedBundle: AtlasBundle | null | undefined;
let pendingLoad: Promise<AtlasBundle | null> | null = null;

export async function loadAtlases(): Promise<AtlasBundle | null> {
  if (cachedBundle !== undefined) {
    return cachedBundle;
  }
  if (pendingLoad) {
    return pendingLoad;
  }
  if (typeof Image === 'undefined') {
    cachedBundle = null;
    return cachedBundle;
  }
  pendingLoad = (async () => {
    const atlases: AtlasInfo[] = [];
    for (const file of ArtConfig.atlases) {
      const url = ArtConfig.base + file;
      if (!(await head(url))) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      try {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load atlas: ${url}`));
        });
      } catch {
        continue;
      }
      const { cols, rows, tile } = sniffGrid(
        img.naturalWidth,
        img.naturalHeight
      );
      atlases.push({ url, cols, rows, tile, count: cols * rows });
    }
    if (atlases.length === 0) {
      return null;
    }
    return {
      atlases,
      totalTiles: atlases.reduce((sum, atlas) => sum + atlas.count, 0)
    };
  })()
    .then((bundle) => {
      cachedBundle = bundle;
      return bundle;
    })
    .catch(() => {
      cachedBundle = null;
      return null;
    })
    .finally(() => {
      pendingLoad = null;
    });
  return pendingLoad;
}

export function hashFNV1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function chooseTileIndex(seed: string, total: number): number {
  if (total <= 0) return 0;
  return hashFNV1a(seed) % total;
}

export function resolveTile(bundle: AtlasBundle, index: number): {
  atlas: AtlasInfo;
  col: number;
  row: number;
} {
  let offset = index;
  for (const atlas of bundle.atlases) {
    if (offset < atlas.count) {
      const col = offset % atlas.cols;
      const row = Math.floor(offset / atlas.cols);
      return { atlas, col, row };
    }
    offset -= atlas.count;
  }
  const fallback = bundle.atlases[bundle.atlases.length - 1];
  return { atlas: fallback, col: 0, row: 0 };
}
