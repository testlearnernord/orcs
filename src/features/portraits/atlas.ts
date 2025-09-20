import { ArtConfig } from '@/config/art';

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

function gcd(a: number, b: number) {
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function sniffGrid(w: number, h: number) {
  const prefs = [
    [6, 4],
    [5, 5],
    [4, 6],
    [6, 5],
    [5, 6],
    [8, 4],
    [4, 8]
  ];
  for (const [c, r] of prefs) {
    if (w % c === 0 && h % r === 0) {
      const tile = Math.min(w / c, h / r);
      if (tile >= 96 && tile <= 512) return { cols: c, rows: r, tile };
    }
  }
  const g = gcd(w, h);
  const tile = Math.max(64, Math.min(512, g));
  return { cols: Math.round(w / tile), rows: Math.round(h / tile), tile };
}

export async function loadAtlases(): Promise<AtlasBundle | null> {
  const atlases: AtlasInfo[] = [];
  for (const file of ArtConfig.atlases) {
    const url = ArtConfig.base + file;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    try {
      await new Promise((res, rej) => {
        img.onload = () => res(null);
        img.onerror = rej;
      });
      const { cols, rows, tile } = sniffGrid(
        img.naturalWidth,
        img.naturalHeight
      );
      atlases.push({ url, cols, rows, tile, count: cols * rows });
    } catch {
      /* fehlt → ignorieren */
    }
  }
  if (!atlases.length) return null;
  return { atlases, totalTiles: atlases.reduce((n, a) => n + a.count, 0) };
}

export function hashFNV1a(str: string) {
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function chooseTileIndex(seed: string, total: number) {
  return total <= 0 ? 0 : hashFNV1a(seed) % total;
}

export function resolveTile(bundle: AtlasBundle, idx: number) {
  let k = idx;
  for (const a of bundle.atlases) {
    if (k < a.count)
      return { atlas: a, col: k % a.cols, row: Math.floor(k / a.cols) };
    k -= a.count;
  }
  const last = bundle.atlases[bundle.atlases.length - 1];
  return { atlas: last, col: 0, row: 0 };
}

declare global {
  interface Window {
    __PORTRAITS__?: any;
  }
}
if (import.meta.env.DEV) (window as any).__PORTRAITS__ = { loadAtlases };
