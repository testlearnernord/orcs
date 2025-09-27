export type AtlasSpec = {
  id: string;
  src: string;
  cols: number;
  rows: number;
  tile: number;
};

export type AtlasDefinition = Omit<AtlasSpec, 'src'>;

export const ATLAS_SPECS: AtlasDefinition[] = [
  { id: 'set_a', cols: 4, rows: 6, tile: 256 },
  { id: 'set_b', cols: 4, rows: 6, tile: 256 }
];

const rawBase = (import.meta as any)?.env?.BASE_URL ?? '/';
const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

const REMOTE_ORIGIN =
  'https://raw.githubusercontent.com/testlearnernord/orcs/main/docs/assets/orcs/portraits';

export type PortraitSetDefinition = {
  id: string;
  file: string;
  cols: number;
  rows: number;
  weight?: number;
  tags?: string[];
};

const ATLAS_DEFINITIONS: PortraitSetDefinition[] = [
  { id: 'set_a', file: 'set_a.webp', cols: 6, rows: 8, weight: 1 },
  { id: 'set_b', file: 'set_b.webp', cols: 6, rows: 8, weight: 1 }
];

const LOCAL = ATLAS_DEFINITIONS.map(
  (definition) => `${normalizedBase}assets/orcs/portraits/${definition.file}`
);
const REMOTE = ATLAS_DEFINITIONS.map(
  (definition) => `${REMOTE_ORIGIN}/${definition.file}`
);

export const PORTRAIT_URLS = [...LOCAL, ...REMOTE];

export type PortraitAtlasSource = {
  id: string;
  file: string;
  urls: string[];
};

export const PORTRAIT_SOURCES: PortraitAtlasSource[] = ATLAS_DEFINITIONS.map(
  (definition, index) => ({
    id: definition.id,
    file: definition.file,
    urls: [LOCAL[index], REMOTE[index]]
  })
);

export const PORTRAIT_SET_DEFINITIONS = ATLAS_DEFINITIONS.map(
  ({ id, file, cols, rows, weight, tags }) => ({
    id,
    file,
    cols,
    rows,
    weight: typeof weight === 'number' ? weight : 1,
    tags: Array.isArray(tags) ? [...tags] : []
  })
);

export const PORTRAIT_BASE = normalizedBase;
export const REMOTE_PORTRAIT_ORIGIN = REMOTE_ORIGIN;
