import type {
  Officer,
  WarcallPhase,
  WarcallPlan,
  WarcallResolution
} from '@sim/types';
import type { Status } from '@state/selectors/warcalls';

export interface WarcallEntry {
  plan: WarcallPlan;
  participants: Officer[];
  resolution?: WarcallResolution;
  currentCycle: number;
  phase: WarcallPhase;
  status: Status;
}

export interface WarcallBucket {
  label: string;
  status: Status;
  entries: WarcallEntry[];
}
