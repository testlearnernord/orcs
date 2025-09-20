import { EventBus } from '@state/eventBus';

export type SortMode =
  | 'merit'
  | 'level'
  | 'loyalToKing'
  | 'relations'
  | 'recentChange'
  | 'random';

export interface UIFilters {
  loyalToKing?: boolean;
  rivalsOfKing?: boolean;
  friendships?: boolean;
  rivalries?: boolean;
  bloodoaths?: boolean;
  lowBravery?: boolean;
  highGreed?: boolean;
  promotionCandidates?: boolean;
  coupRisk?: boolean;
  sortBy: SortMode;
}

export type FilterKey = Exclude<keyof UIFilters, 'sortBy'>;

interface FilterEvents extends Record<string, UIFilters> {
  change: UIFilters;
}

const DEFAULT_FILTERS: UIFilters = {
  sortBy: 'merit'
};

export class UIFilterStore extends EventBus<FilterEvents> {
  private state: UIFilters = { ...DEFAULT_FILTERS };

  getState(): UIFilters {
    return this.state;
  }

  toggle(key: FilterKey): void {
    const next = {
      ...this.state,
      [key]: !this.state[key]
    };
    if (next[key] === false) {
      delete next[key];
    }
    this.state = next;
    this.emit('change', this.state);
  }

  setSort(sortBy: SortMode): void {
    if (this.state.sortBy === sortBy) return;
    this.state = { ...this.state, sortBy };
    this.emit('change', this.state);
  }

  clear(): void {
    this.state = { ...DEFAULT_FILTERS };
    this.emit('change', this.state);
  }
}
