import type { Officer, WarcallPlan, WarcallResolution } from '@sim/types';

export interface WarcallEntry {
  plan: WarcallPlan;
  participants: Officer[];
  resolution?: WarcallResolution;
  currentCycle: number;
}

export interface WarcallBucket {
  label: string;
  entries: WarcallEntry[];
}
