const silhouetteCache = new Map<number, string>();

function normalizeSize(size: number | undefined): number {
  if (!Number.isFinite(size ?? NaN) || (size ?? 0) <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(size!));
}

function canAccessDocument(): boolean {
  return typeof document !== 'undefined';
}

export function makeSilhouetteDataURL(size = 96): string {
  const dimension = normalizeSize(size);
  const cached = silhouetteCache.get(dimension);
  if (cached) {
    return cached;
  }

  if (!canAccessDocument()) {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = dimension;
  canvas.height = dimension;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  ctx.clearRect(0, 0, dimension, dimension);
  ctx.fillStyle = '#101820';
  ctx.fillRect(0, 0, dimension, dimension);

  ctx.fillStyle = '#2e3a23';
  ctx.beginPath();
  ctx.arc(dimension * 0.5, dimension * 0.42, dimension * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillRect(
    dimension * 0.22,
    dimension * 0.6,
    dimension * 0.56,
    dimension * 0.28
  );

  const url = canvas.toDataURL('image/png');
  silhouetteCache.set(dimension, url);
  return url;
}

export function clearSilhouetteCache(): void {
  silhouetteCache.clear();
}

export function getSilhouetteCacheSize(): number {
  return silhouetteCache.size;
}
