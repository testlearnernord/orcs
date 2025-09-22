export type PortraitSet = {
  id: string;
  src: string;
  cols: number;
  rows: number;
  margin?: number;
  padding?: number;
  weight?: number;
  tags?: string[];
};

export type PortraitManifest = {
  version: number;
  sets: PortraitSet[];
};
