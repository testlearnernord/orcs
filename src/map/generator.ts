import { RNG } from '@sim/rng';

export type Biome =
  | 'desert'
  | 'plains'
  | 'forest'
  | 'swamp'
  | 'tundra'
  | 'ashwastes'
  | 'volcano'
  | 'river';

export interface WorldMap {
  seed: string;
  size: number;
  tiles: Biome[];
  height: Float32Array;
  temperature: Float32Array;
  moisture: Float32Array;
}

interface LayerConfig {
  scale: number;
  weight: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleLayer(seed: string, size: number, scale: number): Float32Array {
  if (scale <= 0) {
    const fill = new Float32Array(size * size);
    fill.fill(0.5);
    return fill;
  }
  const rng = new RNG(`${seed}:layer:${scale}`);
  const coarseSize = scale + 1;
  const coarse = new Float32Array(coarseSize * coarseSize);
  for (let i = 0; i < coarse.length; i += 1) {
    coarse[i] = rng.next();
  }
  const field = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    const gy = (y / (size - 1)) * scale;
    const y0 = Math.floor(gy);
    const y1 = Math.min(scale, y0 + 1);
    const fy = gy - y0;
    for (let x = 0; x < size; x += 1) {
      const gx = (x / (size - 1)) * scale;
      const x0 = Math.floor(gx);
      const x1 = Math.min(scale, x0 + 1);
      const fx = gx - x0;
      const idx00 = y0 * coarseSize + x0;
      const idx10 = y0 * coarseSize + x1;
      const idx01 = y1 * coarseSize + x0;
      const idx11 = y1 * coarseSize + x1;
      const v00 = coarse[idx00];
      const v10 = coarse[idx10];
      const v01 = coarse[idx01];
      const v11 = coarse[idx11];
      const top = lerp(v00, v10, fx);
      const bottom = lerp(v01, v11, fx);
      field[y * size + x] = lerp(top, bottom, fy);
    }
  }
  return field;
}

function normalize(field: Float32Array): Float32Array {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < field.length; i += 1) {
    const value = field[i];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const range = max - min || 1;
  const normalized = new Float32Array(field.length);
  for (let i = 0; i < field.length; i += 1) {
    normalized[i] = (field[i] - min) / range;
  }
  return normalized;
}

function buildField(
  seed: string,
  size: number,
  layers: LayerConfig[]
): Float32Array {
  const field = new Float32Array(size * size);
  const totalWeight = layers.reduce((sum, layer) => sum + layer.weight, 0) || 1;
  layers.forEach((layer, index) => {
    const noise = sampleLayer(`${seed}:${index}`, size, layer.scale);
    for (let i = 0; i < field.length; i += 1) {
      field[i] += noise[i] * layer.weight;
    }
  });
  for (let i = 0; i < field.length; i += 1) {
    field[i] /= totalWeight;
  }
  return normalize(field);
}

function resolveBiome(
  height: number,
  moisture: number,
  temperature: number
): Biome {
  if (height < 0.18) return 'river';
  if (height > 0.92 && temperature > 0.55) return 'volcano';
  if (height > 0.88 && temperature < 0.45) return 'tundra';
  if (temperature < 0.18) {
    return height > 0.45 ? 'tundra' : 'swamp';
  }
  if (temperature < 0.32 && height > 0.6) {
    return 'tundra';
  }
  if (temperature > 0.82 && moisture < 0.35) {
    return 'desert';
  }
  if (height > 0.75 && moisture < 0.4 && temperature > 0.55) {
    return 'ashwastes';
  }
  if (moisture > 0.78 && height < 0.65) {
    return 'swamp';
  }
  if (moisture > 0.6) {
    return 'forest';
  }
  if (height > 0.83 && temperature > 0.5) {
    return 'ashwastes';
  }
  if (height > 0.9) {
    return temperature > 0.6 ? 'volcano' : 'tundra';
  }
  return 'plains';
}

export function generateWorldMap(seed: string, size: number = 256): WorldMap {
  const baseSeed = `${seed}:free-roam-map`;
  const heightField = buildField(baseSeed, size, [
    { scale: 8, weight: 0.5 },
    { scale: 16, weight: 0.3 },
    { scale: 32, weight: 0.2 }
  ]);
  const moistureNoise = buildField(`${baseSeed}:moisture`, size, [
    { scale: 10, weight: 0.6 },
    { scale: 24, weight: 0.4 }
  ]);
  const temperatureNoise = buildField(`${baseSeed}:temperature`, size, [
    { scale: 12, weight: 0.5 },
    { scale: 28, weight: 0.5 }
  ]);

  const moisture = new Float32Array(size * size);
  const temperature = new Float32Array(size * size);
  const tiles: Biome[] = new Array(size * size);

  for (let y = 0; y < size; y += 1) {
    const lat = y / (size - 1 || 1);
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const height = heightField[index];
      const moistureValue = clamp(
        moistureNoise[index] * 0.6 + (1 - height) * 0.4,
        0,
        1
      );
      const temperatureValue = clamp(
        lat * 0.7 + temperatureNoise[index] * 0.3,
        0,
        1
      );
      moisture[index] = moistureValue;
      temperature[index] = temperatureValue;
      tiles[index] = resolveBiome(height, moistureValue, temperatureValue);
    }
  }

  return {
    seed,
    size,
    tiles,
    height: heightField,
    temperature,
    moisture
  };
}
