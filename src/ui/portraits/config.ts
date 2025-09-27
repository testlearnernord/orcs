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
