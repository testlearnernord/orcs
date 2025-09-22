import { useMemo, type CSSProperties } from 'react';
import type { Officer } from '@sim/types';
import { OfficerAvatar } from '@/features/portraits/Avatar';

export type PortraitProps = {
  officer: Officer;
  size?: number;
  ringColor?: string;
  dead?: boolean;
  className?: string;
};

export default function Portrait({
  officer,
  size = 88,
  ringColor,
  dead,
  className
}: PortraitProps) {
  const ringShadow = useMemo(() => {
    if (!ringColor) return undefined;
    return `0 0 0 3px ${ringColor} inset, 0 0 18px ${ringColor}33`;
  }, [ringColor]);

  const style = useMemo<CSSProperties>(
    () => ({
      boxShadow: ringShadow,
      filter: dead ? 'grayscale(0.9) brightness(0.85)' : undefined,
      borderRadius: 12
    }),
    [dead, ringShadow]
  );

  const stableId = officer.stableId ?? officer.id;

  return (
    <OfficerAvatar
      officerId={stableId}
      size={size}
      title={officer.name}
      className={className}
      style={style}
    />
  );
}
