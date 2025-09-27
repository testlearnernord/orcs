import React from 'react';

import { makeSilhouetteDataURL } from '@/ui/portraits/fallback';
import { portraitIndexFor } from '@/ui/portraits/indexFor';
import type { LoadedAtlas } from './portrait-atlas';
import { loadPortraitAtlases, sliceTileToURL } from './portrait-atlas';

type FallbackReason = 'legacy' | 'missing';

type ArtMode = 'atlases' | 'legacy';

type Selection = {
  atlas: LoadedAtlas;
  index: number;
};

export type OfficerAvatarProps = {
  officerId: string;
  size?: number;
  title?: string;
  className?: string;
  requireTag?: string;
  style?: React.CSSProperties;
};

function detectArtMode(): ArtMode {
  if (typeof window === 'undefined') return 'atlases';
  try {
    return window.localStorage?.getItem('art.active') === 'legacy'
      ? 'legacy'
      : 'atlases';
  } catch {
    return 'atlases';
  }
}

function getClassName(base: string, extra?: string): string {
  return [base, extra].filter(Boolean).join(' ');
}

function safeId(id: string): string {
  return id && id.trim() ? id.trim() : 'unknown-officer';
}

function mergeStyles(
  computed: React.CSSProperties | null,
  size: number,
  override?: React.CSSProperties
): React.CSSProperties {
  const base: React.CSSProperties = computed ? { ...computed } : {};
  const dimension = Math.max(1, Math.round(size));
  if (override) {
    Object.assign(base, override);
  }
  base.width = dimension;
  base.height = dimension;
  if (override?.borderRadius !== undefined) {
    base.borderRadius = override.borderRadius;
  } else if (base.borderRadius === undefined) {
    base.borderRadius = 12;
  }
  return base;
}

function totalTiles(atlases: LoadedAtlas[]): number {
  return atlases.reduce((sum, atlas) => {
    const tiles = Math.max(
      0,
      Math.floor(atlas.spec.cols) * Math.floor(atlas.spec.rows)
    );
    return sum + tiles;
  }, 0);
}

function selectAtlas(
  atlases: LoadedAtlas[],
  globalIndex: number
): Selection | null {
  let cursor = globalIndex;
  for (const atlas of atlases) {
    const tiles = Math.max(
      0,
      Math.floor(atlas.spec.cols) * Math.floor(atlas.spec.rows)
    );
    if (tiles <= 0) continue;
    if (cursor < tiles) {
      return { atlas, index: cursor };
    }
    cursor -= tiles;
  }
  return null;
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
  const [portraitUrl, setPortraitUrl] = React.useState<string | null>(null);
  const [activeSet, setActiveSet] = React.useState<string | null>(null);
  const [artMode, setArtMode] = React.useState<ArtMode>(() => detectArtMode());
  const [fallbackReason, setFallbackReason] =
    React.useState<FallbackReason | null>(null);
  const objectUrlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncMode = () => setArtMode(detectArtMode());
    syncMode();
    window.addEventListener('storage', syncMode);
    return () => {
      window.removeEventListener('storage', syncMode);
    };
  }, []);

  React.useEffect(() => {
    if (requireTag && import.meta.env.DEV) {
      console.warn(
        '[portraits] requireTag is not supported with atlas slicing'
      );
    }
  }, [requireTag]);

  React.useEffect(() => {
    let cancelled = false;

    const cleanupObjectUrl = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    (async () => {
      cleanupObjectUrl();
      setPortraitUrl(null);
      setActiveSet(null);
      setFallbackReason(null);

      if (artMode === 'legacy') {
        if (!cancelled) {
          setFallbackReason('legacy');
        }
        return;
      }

      try {
        const atlases = await loadPortraitAtlases();
        const usableAtlases = atlases.filter(
          (atlas) => atlas.spec.cols > 0 && atlas.spec.rows > 0
        );

        if (!usableAtlases.length) {
          throw new Error('No portrait atlases available');
        }

        const total = totalTiles(usableAtlases);
        if (total <= 0) {
          throw new Error('No portrait tiles available');
        }

        const globalIndex = portraitIndexFor(id, total);
        const picked = selectAtlas(usableAtlases, globalIndex);
        if (!picked) {
          throw new Error('Unable to resolve portrait index');
        }

        const targetSize = Math.max(1, Math.round(size));
        const url = await sliceTileToURL(
          picked.atlas,
          picked.index,
          targetSize
        );

        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        cleanupObjectUrl();
        objectUrlRef.current = url;
        setPortraitUrl(url);
        setActiveSet(picked.atlas.spec.id);
        setFallbackReason(null);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[portraits] avatar init failed', error);
        }
        cleanupObjectUrl();
        if (!cancelled) {
          setFallbackReason('missing');
          setPortraitUrl(null);
          setActiveSet(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanupObjectUrl();
    };
  }, [artMode, id, size, requireTag]);

  const combinedStyle = React.useMemo(
    () => mergeStyles(null, size, style),
    [size, style]
  );

  const fallbackStyle = React.useMemo(
    () =>
      mergeStyles(
        {
          backgroundColor: 'rgba(17, 24, 39, 0.6)',
          border: '1px dashed rgba(148, 163, 184, 0.45)',
          color: '#a3b5d9'
        },
        size,
        style
      ),
    [size, style]
  );

  const width = Math.max(1, Math.round(size));
  const height = width;
  const label = title ?? id;

  if (fallbackReason) {
    const fallbackSrc = makeSilhouetteDataURL(width);
    const tooltip =
      fallbackReason === 'missing' && import.meta.env.DEV
        ? `${label} — Portrait fehlte, siehe Konsole.`
        : label;

    return (
      <img
        src={fallbackSrc || undefined}
        alt={label}
        title={tooltip}
        width={width}
        height={height}
        data-art={fallbackReason === 'legacy' ? 'legacy' : 'fallback'}
        className={getClassName(
          'officer-avatar officer-avatar--fallback',
          className
        )}
        style={fallbackStyle}
      />
    );
  }

  if (!portraitUrl) {
    return (
      <div
        role="img"
        aria-label={label}
        title={title}
        data-state="loading"
        className={getClassName(
          'officer-avatar officer-avatar--loading',
          className
        )}
        style={combinedStyle}
      />
    );
  }

  return (
    <img
      src={portraitUrl}
      alt={label}
      title={title}
      width={width}
      height={height}
      decoding="async"
      loading="lazy"
      data-portrait-set={activeSet ?? undefined}
      className={getClassName('officer-avatar', className)}
      style={combinedStyle}
    />
  );
};
