import type { CSSProperties } from 'react';
import { getLegacyPortraitUrl } from '@sim/portraits';
import type { AvatarProps } from '@/ui/officer/Avatar';

const DEAD_FILTER = 'grayscale(0.9) brightness(0.85)';

function withRing(ringColor?: string): string | undefined {
  if (!ringColor) return undefined;
  if (ringColor.startsWith('var('))
    return `0 0 0 3px ${ringColor} inset, 0 0 18px ${ringColor}`;
  return `0 0 0 3px ${ringColor} inset, 0 0 18px ${ringColor}33`;
}

export default function LegacyAvatar({
  officer,
  size = 88,
  ringColor,
  dead,
  className
}: AvatarProps) {
  const url = getLegacyPortraitUrl(officer.portraitSeed);
  const common: CSSProperties = {
    width: size,
    height: size,
    borderRadius: 12,
    filter: dead ? DEAD_FILTER : 'none',
    boxShadow: withRing(ringColor)
  };

  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={className}
        style={{
          ...common,
          display: 'block',
          objectFit: 'cover'
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        ...common,
        background: '#1d2531'
      }}
    />
  );
}
