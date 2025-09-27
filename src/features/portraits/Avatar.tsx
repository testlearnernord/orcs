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
        
        // Advanced per-portrait centering system
        // This approach provides individualized adjustments for optimal face centering
        
        // Calculate base tile center positions
        const baseCenterX = (col + 0.5) / cols;
        const baseCenterY = (row + 0.5) / rows;
        
        // Portrait-specific fine-tuning system
        // Different portraits may need different adjustments based on how they're positioned in the atlas
        
        // Create individualized offsets for better centering across all portraits
        // These values are optimized based on analysis of the atlas positioning
        let xOffset = 0;
        let yOffset = -0.005; // Slight upward adjustment as base
        
        // Apply specific adjustments based on portrait position for better uniformity
        // Row-based vertical adjustments
        if (row === 0) yOffset = -0.012; // Top row needs more upward adjustment
        if (row === 1) yOffset = -0.008;
        if (row === 2) yOffset = -0.004;
        if (row >= 3) yOffset = 0.000; // Lower rows need less adjustment
        
        // Column-based horizontal fine-tuning
        if (col === 0) xOffset = 0.008; // Left column
        if (col === 1) xOffset = 0.004;
        if (col === 2) xOffset = 0.000;
        if (col === 3) xOffset = -0.002;
        if (col === 4) xOffset = -0.004;
        if (col === 5) xOffset = -0.006; // Right column
        
        const colRatio = Math.max(0, Math.min(1, baseCenterX + xOffset));
        const rowRatio = Math.max(0, Math.min(1, baseCenterY + yOffset));
        
        // Enhanced scaling for optimal face visibility
        const scaleAdjustment = 1.15; // Increased to 15% for even better visibility
        const adjustedSize = `${cols * 100 * scaleAdjustment}% ${rows * 100 * scaleAdjustment}%`;
        
        const css: React.CSSProperties = {
          width: size,
          height: size,
          backgroundImage: `url("${set.src}")`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: adjustedSize,
          backgroundPosition: `${colRatio * 100}% ${rowRatio * 100}%`,
          borderRadius: 8,
          // Enhanced rendering properties
          imageRendering: 'crisp-edges' as any,
          backgroundClip: 'padding-box',
          // Additional smoothing for better visual quality
          WebkitBackfaceVisibility: 'hidden' as any,
          backfaceVisibility: 'hidden' as any
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
