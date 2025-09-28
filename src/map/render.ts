import type { Biome, WorldMap } from './generator';

export const BIOME_COLORS: Record<Biome, string> = {
  desert: '#e6d190',     // Warm sandy yellow
  plains: '#7db46c',     // Fresh green
  forest: '#2d5a3d',     // Deep forest green
  swamp: '#3d5c4a',      // Murky swamp green
  tundra: '#b8d4e8',     // Icy blue-white
  ashwastes: '#6b6270',  // Ashen purple-gray
  volcano: '#d84632',    // Volcanic red
  river: '#4a7bc8',      // Clear blue water
  savanna: '#b5a572',    // Golden grassland
  beach: '#f4e4a6',      // Sandy beige
  mountains: '#8b9ba8',  // Stone gray
  jungle: '#1e4429'      // Dark tropical green
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
    const temperature = map.temperature[i];
    
    // Enhanced shading based on height, moisture, and temperature
    let shade = 0.7 + height * 0.4; // Base height shading
    
    // Biome-specific adjustments
    switch (biome) {
      case 'desert':
      case 'savanna':
      case 'beach':
        shade += temperature * 0.2 - moisture * 0.15; // Bright in heat, darker with moisture
        break;
      case 'swamp':
      case 'jungle':
        shade -= 0.1 + moisture * 0.1; // Darker, more moisture = darker
        break;
      case 'volcano':
        shade += 0.3 + temperature * 0.2; // Very bright and hot
        break;
      case 'tundra':
      case 'mountains':
        shade += 0.1 - temperature * 0.2; // Bright snow, darker in warmth
        break;
      case 'river':
        shade = 0.8 + height * 0.1; // Consistent water appearance
        break;
      default:
        shade += (temperature - 0.5) * 0.1; // Slight temperature influence
    }
    
    shade = clamp01(shade);
    
    const index = i * 4;
    data[index] = Math.round(r * shade);
    data[index + 1] = Math.round(g * shade);
    data[index + 2] = Math.round(b * shade);
    data[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
}
