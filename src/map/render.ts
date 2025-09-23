import type { Biome, WorldMap } from './generator';

export const BIOME_COLORS: Record<Biome, string> = {
  desert: '#d7a86b',
  plains: '#5fa463',
  forest: '#2f6f3b',
  swamp: '#244836',
  tundra: '#a9c2d9',
  ashwastes: '#5b5463',
  volcano: '#c34632',
  river: '#3b6fc1'
};

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function renderWorldMap(
  canvas: HTMLCanvasElement,
  map: WorldMap,
  palette: Partial<Record<Biome, string>> = {}
): void {
  const context = canvas.getContext('2d');
  if (!context) return;

  if (canvas.width !== map.size || canvas.height !== map.size) {
    canvas.width = map.size;
    canvas.height = map.size;
  }

  const imageData = context.createImageData(map.size, map.size);
  const { data } = imageData;

  for (let i = 0; i < map.tiles.length; i += 1) {
    const biome = map.tiles[i];
    const baseColor = palette[biome] ?? BIOME_COLORS[biome];
    const [r, g, b] = hexToRgb(baseColor);
    const height = map.height[i];
    const moisture = map.moisture[i];
    const shade = clamp01(0.75 + height * 0.3 - moisture * 0.1);
    const index = i * 4;
    data[index] = Math.round(r * shade);
    data[index + 1] = Math.round(g * shade);
    data[index + 2] = Math.round(b * shade);
    data[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
}
