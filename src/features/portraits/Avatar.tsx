import React from 'react';

import { chooseSetAndIndex } from './mapping';
import { loadPortraitAtlases, type PortraitAtlasMap } from './portrait-atlas';
import { PORTRAIT_SET_DEFINITIONS } from '@/ui/portraits/config';
import type { PortraitSet } from './types';

type FallbackReason = 'legacy' | 'missing';

function detectArtMode(): 'atlases' | 'legacy' {
  if (typeof window === 'undefined') return 'atlases';
  try {
    return window.localStorage?.getItem('art.active') === 'legacy'
      ? 'legacy'
      : 'atlases';
  } catch {
    return 'atlases';
  }
}

export type OfficerAvatarProps = {
  officerId: string;
  size?: number;
  title?: string;
  className?: string;
  requireTag?: string;
  style?: React.CSSProperties;
};

function filterDefinitions(tag?: string) {
  if (!tag) return PORTRAIT_SET_DEFINITIONS;
  return PORTRAIT_SET_DEFINITIONS.filter((definition) =>
    definition.tags.includes(tag)
  );
}

function deriveAvailableSets(
  definitions: typeof PORTRAIT_SET_DEFINITIONS,
  atlases: PortraitAtlasMap
): PortraitSet[] {
  const sets: PortraitSet[] = [];
  for (const definition of definitions) {
    const atlas = atlases.get(definition.id);
    if (!atlas) continue;
    sets.push({
      id: definition.id,
      src: atlas.url,
      cols: definition.cols,
      rows: definition.rows,
      weight: definition.weight,
      tags: [...definition.tags]
    });
  }
  return sets;
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
  const base: React.CSSProperties = computed
    ? { ...computed }
    : { width: size, height: size, borderRadius: 8 };
  if (override) {
    Object.assign(base, override);
  }
  base.width = size;
  base.height = size;
  if (override?.borderRadius !== undefined) {
    base.borderRadius = override.borderRadius;
  } else if (base.borderRadius === undefined) {
    base.borderRadius = 8;
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
  const [artMode, setArtMode] = React.useState<'atlases' | 'legacy'>(() =>
    detectArtMode()
  );
  const [fallbackReason, setFallbackReason] =
    React.useState<FallbackReason | null>(null);

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
    let alive = true;
    (async () => {
      try {
        if (artMode === 'legacy') {
          if (alive) {
            setTileStyle(null);
            setActiveSet(null);
            setFallbackReason('legacy');
          }
          return;
        }
        const definitions = filterDefinitions(requireTag);
        if (!definitions.length)
          throw new Error('No portrait sets available after filtering');
        const { atlases } = await loadPortraitAtlases();
        const availableSets = deriveAvailableSets(definitions, atlases);
        if (!availableSets.length)
          throw new Error('No portrait atlases available');
        const { set, col, row } = chooseSetAndIndex(id, availableSets);
        const cols = Math.max(1, set.cols);
        const rows = Math.max(1, set.rows);

        // Revolutionary portrait extraction system for consistent quality
        // This approach completely reimagines how we extract and display portraits

        // Calculate the actual tile dimensions as percentages of the atlas
        const tileWidth = 100 / cols;
        const tileHeight = 100 / rows;

        // Calculate precise tile boundaries to avoid edge artifacts from adjacent tiles

        // Calculate the center position of the specific tile
        const tileCenterX = col * tileWidth + tileWidth / 2;
        const tileCenterY = row * tileHeight + tileHeight / 2;

        // Advanced scaling system for optimal portrait extraction
        // Scale the atlas appropriately to show more detail while preventing overlap
        const scaleFactor = 1.25; // 25% larger for better face detail
        const scaledAtlasWidth = cols * 100 * scaleFactor;
        const scaledAtlasHeight = rows * 100 * scaleFactor;

        // Calculate positioning to center the tile within the portrait frame
        // This ensures the face from the specific tile is properly displayed
        const positionX = tileCenterX * scaleFactor;
        const positionY = tileCenterY * scaleFactor;

        // Fine-tuning adjustments optimized for 4x6 atlas configuration
        // These micro-adjustments account for how faces are positioned within tiles
        let finetuneX = 0;
        let finetuneY = 0;

        // Vertical fine-tuning based on row position (now optimized for 6 rows)
        // Faces in different rows may be positioned differently within their tiles
        if (row === 0)
          finetuneY = -1.0; // Top row faces tend to be lower in their tiles
        else if (row === 1) finetuneY = -0.6;
        else if (row === 2) finetuneY = -0.2;
        else if (row === 3) finetuneY = 0.2;
        else if (row === 4) finetuneY = 0.4;
        else if (row === 5) finetuneY = 0.6; // Bottom row may need upward adjustment

        // Horizontal fine-tuning based on column position (now optimized for 4 columns)
        if (col === 0)
          finetuneX = 0.6; // Left column faces may be offset right
        else if (col === 1) finetuneX = 0.2;
        else if (col === 2) finetuneX = -0.2;
        else if (col === 3) finetuneX = -0.6; // Right column faces may be offset left

        const finalPositionX = positionX + finetuneX;
        const finalPositionY = positionY + finetuneY;

        const css: React.CSSProperties = {
          width: size,
          height: size,
          backgroundImage: `url("${set.src}")`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${scaledAtlasWidth}% ${scaledAtlasHeight}%`,
          backgroundPosition: `${finalPositionX}% ${finalPositionY}%`,
          borderRadius: 8,
          // Advanced rendering optimizations for crisp portrait display
          imageRendering: 'crisp-edges' as any,
          backgroundClip: 'padding-box',
          WebkitBackfaceVisibility: 'hidden' as any,
          backfaceVisibility: 'hidden' as any,
          // Additional smoothing properties
          WebkitFontSmoothing: 'antialiased' as any,
          MozOsxFontSmoothing: 'grayscale' as any
        };
        if (alive) {
          setTileStyle(css);
          setActiveSet(set.id);
          setFallbackReason(null);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[portraits] avatar init failed', err);
        }
        if (alive) {
          setTileStyle(null);
          setActiveSet(null);
          setFallbackReason('missing');
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [artMode, id, requireTag, size]);

  const combinedStyle = React.useMemo(
    () => mergeStyles(tileStyle, size, style),
    [tileStyle, size, style]
  );

  if (fallbackReason) {
    const baseLabel = title ?? id;
    const fallbackStyle = mergeStyles(
      {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(17, 24, 39, 0.6)',
        border: '1px dashed rgba(148, 163, 184, 0.45)',
        color: '#a3b5d9'
      },
      size,
      style
    );
    const tooltip =
      fallbackReason === 'missing' && import.meta.env.DEV
        ? `${baseLabel} — Portrait fehlte, siehe Konsole.`
        : fallbackReason
          ? baseLabel
          : title;
    const svgSize = Math.round(size * 0.62);
    return (
      <div
        role="img"
        aria-label={baseLabel}
        title={tooltip}
        data-art={fallbackReason === 'legacy' ? 'legacy' : 'fallback'}
        className={getClassName(
          'officer-avatar officer-avatar--fallback',
          className
        )}
        style={fallbackStyle}
      >
        <svg
          width={svgSize}
          height={svgSize}
          viewBox="0 0 128 128"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="64" cy="44" r="28" fill="rgba(148,163,184,0.4)" />
          <path
            d="M24 116c0-22.091 17.909-40 40-40s40 17.909 40 40"
            fill="rgba(148,163,184,0.4)"
          />
          <circle cx="64" cy="44" r="18" fill="rgba(226,232,240,0.8)" />
          <path
            d="M40 116c2-16 12-28 24-28s22 12 24 28"
            fill="rgba(226,232,240,0.8)"
          />
        </svg>
      </div>
    );
  }

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
