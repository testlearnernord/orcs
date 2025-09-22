import React from 'react';
import { OfficerAvatar } from '@/features/portraits/Avatar';
import type { Officer } from '@/sim/types';

type Props = {
  officer: Officer;
  size?: number;
  className?: string;
  title?: string;
};

export default function Portrait({
  officer,
  size = 64,
  className = '',
  title
}: Props) {
  const stableId = officer.stableId?.trim() || officer.id;
  return (
    <OfficerAvatar
      officerId={stableId}
      size={size}
      className={className}
      title={title ?? officer.name}
    />
  );
}
