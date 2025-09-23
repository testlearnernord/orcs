import React from 'react';

import { loadPortraitManifest } from './manifest';
import { chooseSetAndIndex } from './mapping';

export type OfficerAvatarProps = {
  officerId: string;
  size?: number;
  title?: string;
  className?: string;
  requireTag?: string;
  style?: React.CSSProperties;
};

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

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const manifest = await loadPortraitManifest();
        const sets = requireTag
          ? manifest.sets.filter((s) => (s.tags || []).includes(requireTag))
          : manifest.sets;
        if (!sets.length)
          throw new Error('No portrait sets available after filtering');
        const { set, col, row } = chooseSetAndIndex(id, sets);
        const cols = Math.max(1, set.cols);
        const rows = Math.max(1, set.rows);
        const colRatio = cols > 1 ? col / (cols - 1) : 0;
        const rowRatio = rows > 1 ? row / (rows - 1) : 0;
        const css: React.CSSProperties = {
          width: size,
          height: size,
          backgroundImage: `url("${set.src}")`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${cols * 100}% ${rows * 100}%`,
          backgroundPosition: `${colRatio * 100}% ${rowRatio * 100}%`,
          borderRadius: 8
        };
        if (alive) {
          setTileStyle(css);
          setActiveSet(set.id);
        }
      } catch (err) {
        console.error('[PORTRAITS] avatar init failed', err);
        if (alive) {
          setTileStyle(null);
          setActiveSet(null);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, requireTag, size]);

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
