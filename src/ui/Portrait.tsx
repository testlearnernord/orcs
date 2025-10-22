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
  // Additional fix: Always provide a deterministic fallback to prevent render issues
  const effectiveId = React.useMemo(() => {
    // Prioritize stableId (it's designed to be stable across state updates)
    const stable = officer.stableId?.trim();
    if (stable) return stable;
    
    // Fall back to regular id
    const regular = officer.id?.trim();
    if (regular) return regular;
    
    // Last resort: use name-based fallback (deterministic)
    const nameFallback = officer.name?.trim();
    return nameFallback ? `officer-${nameFallback}` : 'unknown-officer';
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
