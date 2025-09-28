import { RNG } from '@sim/rng';

export type Biome =
  | 'desert' // Wüste
  | 'plains' // Wiese
  | 'forest' // Wald
  | 'swamp' // Sumpf
  | 'tundra' // Schnee
  | 'ashwastes' // Ascheland
  | 'volcano' // Vulkan
  | 'river' // Fluss
  | 'savanna' // Savanne
  | 'beach' // Strand
  | 'mountains' // Berge
  | 'jungle'; // Dschungel

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
  // Water bodies - rivers and coastal areas
  if (height < 0.15) return 'river';
  if (height < 0.25 && moisture > 0.6) return 'beach';

  // High altitude biomes
  if (height > 0.92 && temperature > 0.6) return 'volcano';
  if (height > 0.85) return temperature < 0.4 ? 'tundra' : 'mountains';

  // Cold regions
  if (temperature < 0.2) {
    if (height > 0.6) return 'tundra';
    return moisture > 0.5 ? 'swamp' : 'tundra';
  }

  // Very hot regions
  if (temperature > 0.85) {
    if (moisture < 0.25) return 'desert';
    if (moisture < 0.45) return 'savanna';
    if (moisture > 0.8 && height < 0.6) return 'jungle';
    return 'ashwastes';
  }

  // Hot regions
  if (temperature > 0.65) {
    if (moisture < 0.3) return 'desert';
    if (moisture < 0.5) return 'savanna';
    if (moisture > 0.75) return height < 0.5 ? 'jungle' : 'forest';
    return 'plains';
  }

  // Temperate regions
  if (temperature > 0.45) {
    if (moisture > 0.8 && height < 0.4) return 'swamp';
    if (moisture > 0.65) return 'forest';
    if (moisture < 0.35 && height > 0.7) return 'ashwastes';
    return 'plains';
  }

  // Cool regions
  if (moisture > 0.7 && height < 0.5) return 'swamp';
  if (moisture > 0.6) return 'forest';
  if (height > 0.75) return 'mountains';

  return 'plains';
}

export function generateWorldMap(seed: string, size: number = 512): WorldMap {
  const baseSeed = `${seed}:enhanced-free-roam-map`;

  // Generate height with multiple octaves for more interesting terrain
  const heightField = buildField(baseSeed, size, [
    { scale: 4, weight: 0.4 },
    { scale: 8, weight: 0.3 },
    { scale: 16, weight: 0.2 },
    { scale: 32, weight: 0.1 }
  ]);

  // More varied moisture patterns
  const moistureNoise = buildField(`${baseSeed}:moisture`, size, [
    { scale: 6, weight: 0.5 },
    { scale: 12, weight: 0.3 },
    { scale: 24, weight: 0.2 }
  ]);

  // Temperature with latitude influence and local variations
  const temperatureNoise = buildField(`${baseSeed}:temperature`, size, [
    { scale: 8, weight: 0.4 },
    { scale: 16, weight: 0.3 },
    { scale: 32, weight: 0.3 }
  ]);

  const moisture = new Float32Array(size * size);
  const temperature = new Float32Array(size * size);
  const tiles: Biome[] = new Array(size * size);

  for (let y = 0; y < size; y += 1) {
    const lat = y / (size - 1 || 1);
    // Create more dramatic latitude temperature gradient
    const latitudeFactor = Math.pow(lat, 1.2);

    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const height = heightField[index];

      // Enhanced moisture calculation with height influence
      const moistureValue = clamp(
        moistureNoise[index] * 0.7 +
          (1 - height) * 0.3 +
          // Coastal moisture bonus
          (height < 0.3 ? 0.2 : 0),
        0,
        1
      );

      // Enhanced temperature with altitude cooling
      const altitudeCooling = Math.max(0, height - 0.5) * 0.4;
      const temperatureValue = clamp(
        latitudeFactor * 0.6 + temperatureNoise[index] * 0.4 - altitudeCooling,
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
