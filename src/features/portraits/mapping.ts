import { hashString } from './hash';
import type { PortraitSet } from './types';

function totalTiles(set: PortraitSet): number {
  return Math.max(0, Math.floor(set.cols) * Math.floor(set.rows));
}

export function chooseSetAndIndex(
  officerStableId: string,
  sets: PortraitSet[]
) {
  if (!sets.length) {
    throw new Error('No portrait sets provided');
  }
  const ranges: Array<{ set: PortraitSet; start: number; end: number }> = [];
  let cursor = 0;

  for (const set of sets) {
    const tiles = totalTiles(set);
    if (tiles <= 0) continue;
    const weight = typeof set.weight === 'number' ? set.weight : 1;
    if (weight <= 0) continue;
    const weightedTiles = Math.max(1, Math.round(tiles * weight));
    const start = cursor;
    cursor += weightedTiles;
    ranges.push({ set, start, end: cursor });
  }

  if (!ranges.length || cursor <= 0) {
    throw new Error('No tiles available');
  }

  const hash = hashString(officerStableId);
  const pick = hash % cursor;
  const selected =
    ranges.find((range) => pick >= range.start && pick < range.end) ??
    ranges[ranges.length - 1];

  const tilesInSet = totalTiles(selected.set);
  const localIndex = tilesInSet > 0 ? hash % tilesInSet : 0;
  const col = tilesInSet > 0 ? localIndex % selected.set.cols : 0;
  const row = tilesInSet > 0 ? Math.floor(localIndex / selected.set.cols) : 0;

  return { set: selected.set, index: localIndex, col, row };
}
