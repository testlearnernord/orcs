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
  // Ensure we always have a valid ID for portrait lookup
  // Use stableId if available and non-empty, otherwise fall back to id
  // Fix: Handle edge cases where stableId might be empty string or whitespace
  const effectiveId = React.useMemo(() => {
    const stable = officer.stableId?.trim();
    const regular = officer.id?.trim();
    return stable || regular || `fallback-${officer.name}`;
  }, [officer.id, officer.stableId, officer.name]);
  
  return (
    <OfficerAvatar
      officerId={effectiveId}
      size={size}
      className={className}
      title={title ?? officer.name}
      rank={officer.rank}
      potential={officer.stats.potential}
    />
  );
}
