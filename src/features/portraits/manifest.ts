import type { PortraitManifest, PortraitSet } from './types';

let cache: PortraitManifest | null = null;
let pending: Promise<PortraitManifest> | null = null;

function normalizeSet(raw: PortraitSet): PortraitSet {
  const id = raw.id.trim();
  const src = raw.src.trim();
  const cols = Math.max(1, Math.floor(raw.cols));
  const rows = Math.max(1, Math.floor(raw.rows));
  const margin = raw.margin ?? 0;
  const padding = raw.padding ?? 0;
  const weight = raw.weight ?? 1;

  return {
    id,
    src,
    cols,
    rows,
    margin: margin > 0 ? margin : margin === 0 ? 0 : undefined,
    padding: padding > 0 ? padding : padding === 0 ? 0 : undefined,
    weight: weight >= 0 ? weight : 1,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined
  };
}

function validateManifest(data: PortraitManifest): PortraitManifest {
  if (!Array.isArray(data.sets) || data.sets.length === 0) {
    throw new Error('Invalid manifest: no sets');
  }
  const sanitizedSets = data.sets.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Invalid manifest entry');
    }
    if (typeof entry.id !== 'string' || !entry.id) {
      throw new Error('Invalid manifest entry: missing id');
    }
    if (typeof entry.src !== 'string' || !entry.src) {
      throw new Error(`Invalid manifest entry: missing src for ${entry.id}`);
    }
    if (typeof entry.cols !== 'number' || typeof entry.rows !== 'number') {
      throw new Error(`Invalid manifest entry: missing grid for ${entry.id}`);
    }
    return normalizeSet(entry);
  });
  return {
    version: typeof data.version === 'number' ? data.version : 1,
    sets: sanitizedSets
  };
}

export async function loadPortraitManifest(): Promise<PortraitManifest> {
  if (cache) return cache;
  if (pending) return pending;
  pending = (async () => {
    const res = await fetch('/orcs/assets/orcs/portraits/manifest.json', {
      cache: 'no-store'
    });
    if (!res.ok) {
      throw new Error('Failed to load portrait manifest');
    }
    const raw = (await res.json()) as PortraitManifest;
    const manifest = validateManifest(raw);
    cache = manifest;
    pending = null;
    return manifest;
  })().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}

export function __resetPortraitManifestCache() {
  cache = null;
  pending = null;
}
