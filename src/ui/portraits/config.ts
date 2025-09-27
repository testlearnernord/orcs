const rawBase = (import.meta as any)?.env?.BASE_URL ?? '/';
const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

// Fallback to correct base path for dev environment where BASE_URL might not be set correctly
const developmentBase = normalizedBase === '/' ? '/orcs/' : normalizedBase;

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
  { 
    id: 'officers_v2', 
    file: 'officers_atlas.webp', 
    cols: 10, 
    rows: 5, 
    weight: 1,
    tags: ['diverse', 'centered', 'sharp'] 
  }
];

const LOCAL = ATLAS_DEFINITIONS.map(
  (definition) => `${developmentBase}assets/orcs/portraits/${definition.file}`
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

export const PORTRAIT_BASE = developmentBase;
export const REMOTE_PORTRAIT_ORIGIN = REMOTE_ORIGIN;
