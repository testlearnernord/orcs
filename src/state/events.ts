import type {
  CycleSummary,
  FeedEntry,
  Officer,
  WarcallPlan,
  WarcallResolution,
  WorldState
} from '@sim/types';
import type { Highlight } from '@state/cycleDigest';
import type { EventMap } from '@state/eventBus';

export interface GameEvents extends EventMap {
  'state:changed': WorldState;
  'cycle:completed': CycleSummary;
  'cycle:digest': { cycle: number; highlights: Highlight[] };
  'feed:appended': FeedEntry[];
  'graveyard:changed': Officer[];
  'warcall:planned': WarcallPlan;
  'warcall:resolved': WarcallResolution;
}
