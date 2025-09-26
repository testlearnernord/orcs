import { RNG } from '@sim/rng';
import type { Biome, WorldMap } from './generator';

export interface MapCoordinate {
  x: number;
  y: number;
  index: number;
  biome: Biome;
}

export function isPassable(biome: Biome): boolean {
  return biome !== 'river';
}

export function toPercent(map: WorldMap, value: number): number {
  return ((value + 0.5) / map.size) * 100;
}

export function findOpenTile(
  map: WorldMap,
  key: string,
  occupied: Set<number>,
  attempts = 120
): MapCoordinate {
  const rng = new RNG(`${map.seed}:nav:${key}`);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const x = rng.int(0, map.size - 1);
    const y = rng.int(0, map.size - 1);
    const index = y * map.size + x;
    const biome = map.tiles[index];
    if (!occupied.has(index) && isPassable(biome)) {
      occupied.add(index);
      return { x, y, index, biome };
    }
  }

  for (let index = 0; index < map.tiles.length; index += 1) {
    if (occupied.has(index)) continue;
    const biome = map.tiles[index];
    if (!isPassable(biome)) continue;
    const x = index % map.size;
    const y = Math.floor(index / map.size);
    occupied.add(index);
    return { x, y, index, biome };
  }

  occupied.add(0);
  return { x: 0, y: 0, index: 0, biome: map.tiles[0] ?? 'plains' };
}
