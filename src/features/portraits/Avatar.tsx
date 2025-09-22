import React from 'react';

import { loadPortraitManifest } from './manifest';
import { chooseSetAndIndex } from './mapping';
import type { PortraitSet } from './types';

export type OfficerAvatarProps = {
  officerId: string;
  size?: number;
  title?: string;
  className?: string;
  requireTag?: string;
  style?: React.CSSProperties;
};

type ImageMetrics = { width: number; height: number };

const metricsCache = new Map<string, Promise<ImageMetrics>>();

function getClassName(base: string, extra?: string): string {
  return [base, extra].filter(Boolean).join(' ');
}

function safeId(id: string): string {
  return id && id.trim() ? id.trim() : 'unknown-officer';
}

async function resolveImageMetrics(src: string): Promise<ImageMetrics | null> {
  if (typeof Image === 'undefined') return null;
  let promise = metricsCache.get(src);
  if (!promise) {
    promise = new Promise<ImageMetrics>((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      (img as any).loading = 'eager';
      img.onload = () => {
        const width = img.naturalWidth || 0;
        const height = img.naturalHeight || 0;
        if (width > 0 && height > 0) {
          resolve({ width, height });
        } else {
          reject(new Error(`Image ${src} has invalid dimensions`));
        }
      };
      img.onerror = () => reject(new Error(`Failed to load image ${src}`));
      img.src = src;
    });
    metricsCache.set(src, promise);
  }
  try {
    return await promise;
  } catch (error) {
    metricsCache.delete(src);
    throw error;
  }
}

function computeTileStyle(
  set: PortraitSet,
  col: number,
  row: number,
  size: number,
  metrics: ImageMetrics | null
): React.CSSProperties {
  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 12,
    backgroundImage: `url("${set.src}")`,
    backgroundRepeat: 'no-repeat'
  };

  if (metrics && metrics.width > 0 && metrics.height > 0) {
    const margin = Math.max(0, set.margin ?? 0);
    const padding = Math.max(0, set.padding ?? 0);
    const cols = Math.max(1, set.cols);
    const rows = Math.max(1, set.rows);

    const usableWidth = metrics.width - margin * 2 - padding * (cols - 1);
    const usableHeight = metrics.height - margin * 2 - padding * (rows - 1);
    const tileWidth = usableWidth / cols;
    const tileHeight = usableHeight / rows;

    if (tileWidth > 0 && tileHeight > 0) {
      const offsetX = margin + col * (tileWidth + padding);
      const offsetY = margin + row * (tileHeight + padding);
      const scaleX = size / tileWidth;
      const scaleY = size / tileHeight;
      base.backgroundSize = `${metrics.width * scaleX}px ${metrics.height * scaleY}px`;
      base.backgroundPosition = `-${offsetX * scaleX}px -${offsetY * scaleY}px`;
      return base;
    }
  }

  const cols = Math.max(1, set.cols);
  const rows = Math.max(1, set.rows);
  base.backgroundSize = `${cols * 100}% ${rows * 100}%`;
  const xPercent = cols > 1 ? (col / (cols - 1)) * 100 : 0;
  const yPercent = rows > 1 ? (row / (rows - 1)) * 100 : 0;
  base.backgroundPosition = `${xPercent}% ${yPercent}%`;
  return base;
}

function mergeStyles(
  computed: React.CSSProperties | null,
  size: number,
  override?: React.CSSProperties
): React.CSSProperties {
  const base: React.CSSProperties = computed
    ? { ...computed }
    : { width: size, height: size, borderRadius: 12 };
  if (override) {
    Object.assign(base, override);
  }
  base.width = size;
  base.height = size;
  if (override?.borderRadius !== undefined) {
    base.borderRadius = override.borderRadius;
  } else if (base.borderRadius === undefined) {
    base.borderRadius = 12;
  }
  return base;
}

export const OfficerAvatar: React.FC<OfficerAvatarProps> = ({
  officerId,
  size = 64,
  title,
  className,
  requireTag,
  style
}) => {
  const id = safeId(officerId);
  const [tileStyle, setTileStyle] = React.useState<React.CSSProperties | null>(
    null
  );
  const [activeSet, setActiveSet] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const manifest = await loadPortraitManifest();
        let eligible = requireTag
          ? manifest.sets.filter((set) => (set.tags ?? []).includes(requireTag))
          : manifest.sets;
        if (eligible.length === 0) {
          eligible = manifest.sets;
        }
        if (eligible.length === 0) {
          if (alive) {
            setActiveSet(null);
            setTileStyle(null);
          }
          return;
        }
        const { set, col, row } = chooseSetAndIndex(id, eligible);
        let metrics: ImageMetrics | null = null;
        try {
          metrics = await resolveImageMetrics(set.src);
        } catch {
          metrics = null;
        }
        if (!alive) return;
        setTileStyle(computeTileStyle(set, col, row, size, metrics));
        setActiveSet(set.id);
      } catch {
        if (alive) {
          setActiveSet(null);
          setTileStyle(null);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, size, requireTag]);

  const combinedStyle = React.useMemo(
    () => mergeStyles(tileStyle, size, style),
    [tileStyle, size, style]
  );

  return (
    <div
      role="img"
      aria-label={title ?? id}
      title={title}
      data-portrait-set={activeSet ?? undefined}
      className={getClassName('officer-avatar', className)}
      style={combinedStyle}
    />
  );
};
