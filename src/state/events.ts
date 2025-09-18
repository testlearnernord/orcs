import type { CycleSummary, FeedEntry, Officer, WorldState } from '@sim/types';
import type { EventMap } from '@state/eventBus';

export interface GameEvents extends EventMap {
  'state:changed': WorldState;
  'cycle:completed': CycleSummary;
  'feed:appended': FeedEntry[];
  'graveyard:changed': Officer[];
}
