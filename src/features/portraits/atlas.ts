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

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function sniffGrid(
  width: number,
  height: number
): { cols: number; rows: number; tile: number } {
  const preferred: Array<[number, number]> = [
    [6, 4],
    [5, 5],
    [4, 6],
    [6, 5],
    [5, 6],
    [8, 4],
    [4, 8]
  ];

  for (const [cols, rows] of preferred) {
    if (width % cols === 0 && height % rows === 0) {
      const tile = Math.min(width / cols, height / rows);
      if (tile >= 96 && tile <= 512) {
        return { cols, rows, tile };
      }
    }
  }

  const size = Math.max(64, Math.min(512, gcd(width, height)));
  return {
    cols: Math.max(1, Math.round(width / size)),
    rows: Math.max(1, Math.round(height / size)),
    tile: size
  };
}

async function head(url: string): Promise<boolean> {
  if (typeof fetch !== 'function') return false;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function loadAtlasesOnce(): Promise<AtlasBundle | null> {
  const atlases: AtlasInfo[] = [];

  for (const file of ArtConfig.atlases) {
    const url = ArtConfig.base + file;
    if (!(await head(url))) continue;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load atlas: ${url}`));
    });

    const { cols, rows, tile } = sniffGrid(img.naturalWidth, img.naturalHeight);
    atlases.push({ url, cols, rows, tile, count: cols * rows });
  }

  if (atlases.length === 0) return null;

  const totalTiles = atlases.reduce((total, atlas) => total + atlas.count, 0);
  return { atlases, totalTiles };
}

let bundlePromise: Promise<AtlasBundle | null> | null = null;

export async function loadAtlases(): Promise<AtlasBundle | null> {
  if (!bundlePromise) {
    bundlePromise = loadAtlasesOnce().catch((error) => {
      bundlePromise = null;
      throw error;
    });
  }
  return bundlePromise;
}

export function hashFNV1a(input: string): number {
  let hash = 0x811c9dc5 | 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function chooseTileIndex(seed: string, total: number): number {
  if (total <= 0) return 0;
  return hashFNV1a(seed) % total;
}

export function resolveTile(
  bundle: AtlasBundle,
  globalIndex: number
): { atlas: AtlasInfo; col: number; row: number } {
  let index = globalIndex;
  for (const atlas of bundle.atlases) {
    if (index < atlas.count) {
      const col = index % atlas.cols;
      const row = Math.floor(index / atlas.cols);
      return { atlas, col, row };
    }
    index -= atlas.count;
  }
  const atlas = bundle.atlases[bundle.atlases.length - 1];
  return { atlas, col: 0, row: 0 };
}

export function resetAtlasCache(): void {
  bundlePromise = null;
}
