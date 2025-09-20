import type { Officer } from '@sim/types';

const RING_COLORS: Record<Officer['rank'], string> = {
  König: '#ffd166',
  Spieler: '#f4a261',
  Captain: '#8ecae6',
  Späher: '#95d5b2',
  Grunzer: '#adb5bd'
};

export function rankToRingColor(rank: Officer['rank']): string {
  return RING_COLORS[rank];
}
