import { EventBus } from '@state/eventBus';

export type SortMode = 'merit' | 'level' | 'random';

export interface UIFilters {
  sortBy: SortMode;
}

export type FilterKey = never; // No more filters

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
    // No filters to toggle anymore
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
