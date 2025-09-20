import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Officer } from '@sim/types';
import {
  chooseTileIndex,
  loadAtlases,
  resolveTile
} from '@/features/portraits/atlas';

export type PortraitProps = {
  officer: Officer;
  size?: number;
  ringColor?: string;
  dead?: boolean;
  className?: string;
};

type AtlasState = Awaited<ReturnType<typeof loadAtlases>> | null;

export default function Portrait({
  officer,
  size = 88,
  ringColor,
  dead,
  className
}: PortraitProps) {
  const [bundle, setBundle] = useState<AtlasState>(null);

  useEffect(() => {
    let cancelled = false;
    loadAtlases()
      .then((loaded) => {
        if (!cancelled) setBundle(loaded);
      })
      .catch(() => {
        if (!cancelled) setBundle(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ringShadow = ringColor
    ? `0 0 0 3px ${ringColor} inset, 0 0 18px ${ringColor}33`
    : undefined;

  if (!bundle) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          background: '#1d2531',
          filter: dead ? 'grayscale(0.9) brightness(0.85)' : 'none',
          boxShadow: ringShadow
        }}
      />
    );
  }

  const traits = Array.isArray(officer.traits) ? officer.traits.join(',') : '';
  const seed = `${officer.id}|${officer.name}|${officer.level}|${traits}`;
  const idx = chooseTileIndex(seed, bundle.totalTiles);
  const { atlas, col, row } = resolveTile(bundle, idx);
  const style = useMemo<CSSProperties>(
    () => ({
      width: size,
      height: size,
      backgroundImage: `url("${atlas.url}")`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${atlas.cols * size}px ${atlas.rows * size}px`,
      backgroundPosition: `-${col * size}px -${row * size}px`,
      borderRadius: 12,
      filter: dead ? 'grayscale(0.9) brightness(0.85)' : 'none',
      boxShadow: ringShadow
    }),
    [atlas.url, atlas.cols, atlas.rows, col, dead, ringShadow, row, size]
  );

  return <div className={className} style={style} aria-hidden="true" />;
}
