import type { CycleSummary, WorldState } from '@sim/types';
import { EventBus } from '@state/eventBus';
import type {
  EnhancedHighlight,
  HighlightModule,
  HighlightDisplayOptions,
  HighlightSystemEvents
} from './types';
import { HighlightType } from './types';
import {
  OfficerDeathModule,
  WarcallResolutionModule,
  DiplomacyModule,
  PromotionsModule,
  NewGruntsModule
} from './modules/index';

/**
 * State interface for the highlight system
 */
export interface HighlightSystemState {
  queue: EnhancedHighlight[];
  showing: EnhancedHighlight | null;
  history: EnhancedHighlight[][];
  options: HighlightDisplayOptions;
}

/**
 * New modular highlight system that completely replaces the old one
 * Features:
 * - Modular highlight generators
 * - Cinematic presentation with officer confrontations
 * - Priority-based ordering
 * - Display options (Skip All, Show/Hide toggle)
 * - Extensible architecture for future enhancements
 */
export class HighlightSystem extends EventBus<HighlightSystemEvents> {
  private readonly modules: Map<HighlightType, HighlightModule> = new Map();
  private state: HighlightSystemState = {
    queue: [],
    showing: null,
    history: [],
    options: {
      enabled: true,
      skipAll: false,
      showAnimations: true
    }
  };

  private readonly MAX_QUEUE = 8;
  private readonly HISTORY_LIMIT = 15;

  constructor() {
    super();
    this.registerDefaultModules();
  }

  /**
   * Register the default highlight modules with their priorities
   */
  private registerDefaultModules(): void {
    const modules = [
      new OfficerDeathModule(), // Priority 1
      new WarcallResolutionModule(), // Priority 2
      new DiplomacyModule(), // Priority 3
      new PromotionsModule(), // Priority 4
      new NewGruntsModule() // Priority 5
    ];

    modules.forEach((module) => {
      this.modules.set(module.type, module);
    });
  }

  /**
   * Register a custom highlight module (for extensibility)
   */
  registerModule(module: HighlightModule): void {
    this.modules.set(module.type, module);
  }

  /**
   * Generate and queue highlights for a cycle
   */
  processcycle(
    prev: WorldState,
    next: WorldState,
    summary?: CycleSummary
  ): void {
    console.log('[HighlightSystem] processcycle called', {
      enabled: this.state.options.enabled,
      summaryExists: !!summary
    });

    if (!this.state.options.enabled) return;

    const allHighlights: EnhancedHighlight[] = [];

    // Generate highlights from all modules
    this.modules.forEach((module) => {
      const highlights = module.generate(prev, next, summary);
      console.log(
        `[HighlightSystem] Module ${module.type} generated ${highlights.length} highlights`
      );
      const filteredHighlights = highlights.filter((highlight) =>
        module.shouldShow
          ? module.shouldShow(highlight, this.state.options)
          : true
      );
      allHighlights.push(...filteredHighlights);
    });

    console.log(
      `[HighlightSystem] Total highlights generated: ${allHighlights.length}`
    );
    if (allHighlights.length === 0) return;

    // Sort by priority (lower number = higher priority) then by ID for consistency
    const sortedHighlights = allHighlights.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.id.localeCompare(b.id);
    });

    // Trim to max queue size
    const trimmedHighlights = sortedHighlights.slice(0, this.MAX_QUEUE);
    if (sortedHighlights.length > this.MAX_QUEUE) {
      console.log(
        `[HighlightSystem] Trimmed ${sortedHighlights.length - this.MAX_QUEUE} highlights due to queue limit`
      );
      // Add overflow highlight
      const overflowHighlight = this.createOverflowHighlight(
        sortedHighlights.slice(this.MAX_QUEUE),
        summary?.cycle || 0
      );
      trimmedHighlights.push(overflowHighlight);
    }

    console.log(
      `[HighlightSystem] Enqueueing ${trimmedHighlights.length} highlights`
    );
    this.enqueueHighlights(trimmedHighlights, summary?.cycle || 0);
  }

  /**
   * Create an overflow highlight for excessive highlights
   */
  private createOverflowHighlight(
    overflow: EnhancedHighlight[],
    cycle: number
  ): EnhancedHighlight {
    const count = overflow.length;
    return {
      id: `overflow:${cycle}`,
      type: HighlightType.NEW_GRUNT, // Lowest priority
      priority: 10,
      cycle,
      icon: '➕',
      title: `+${count} weitere Ereignisse`,
      description:
        count === 1
          ? 'Ein weiteres Ereignis wurde protokolliert.'
          : `${count} weitere Ereignisse wurden protokolliert.`,
      score: 10 + Math.random() * 0.1,
      text:
        count === 1
          ? 'Ein weiteres Ereignis wurde protokolliert.'
          : `${count} weitere Ereignisse wurden protokolliert.`,
      animationType: 'emergence',
      duration: 1000
    };
  }

  /**
   * Add highlights to the queue and update state
   */
  private enqueueHighlights(
    highlights: EnhancedHighlight[],
    cycle: number
  ): void {
    console.log(
      `[HighlightSystem] enqueueHighlights called with ${highlights.length} highlights`
    );
    const newQueue = [...this.state.queue, ...highlights];
    const newHistory = [highlights, ...this.state.history].slice(
      0,
      this.HISTORY_LIMIT
    );

    let showing = this.state.showing;
    let queue = newQueue;

    // Auto-advance if nothing is currently showing
    if (!showing && queue.length > 0) {
      [showing, ...queue] = queue;
      console.log(
        '[HighlightSystem] Auto-advancing to first highlight:',
        showing.title
      );
      this.emit('highlight:shown', showing);
    }

    console.log(
      `[HighlightSystem] Updated state - queue: ${queue.length}, showing: ${showing?.title || 'none'}`
    );

    this.updateState({
      queue,
      showing,
      history: newHistory
    });

    this.emit('highlights:queued', { cycle, highlights });
    console.log(
      `[HighlightSystem] Emitted highlights:queued event for cycle ${cycle}`
    );
  }

  /**
   * Advance to the next highlight
   */
  advance(): void {
    if (this.state.options.skipAll) {
      this.clearAll();
      return;
    }

    if (this.state.queue.length === 0) {
      this.updateState({ showing: null });
      return;
    }

    const [showing, ...queue] = this.state.queue;
    this.updateState({ showing, queue });
    this.emit('highlight:shown', showing);
  }

  /**
   * Skip current highlight
   */
  skip(): void {
    if (this.state.showing) {
      this.emit('highlight:skipped', this.state.showing);
    }
    this.advance();
  }

  /**
   * Clear all highlights (Skip All functionality)
   */
  clearAll(): void {
    const cycle = this.state.showing?.cycle ?? 0;
    this.updateState({
      queue: [],
      showing: null
    });
    this.emit('highlights:cleared', { cycle });
  }

  /**
   * Update display options
   */
  updateOptions(options: Partial<HighlightDisplayOptions>): void {
    const newOptions = { ...this.state.options, ...options };
    this.updateState({ options: newOptions });
    this.emit('options:changed', newOptions);

    // If highlights are disabled, clear everything
    if (!newOptions.enabled) {
      this.clearAll();
    }
  }

  /**
   * Get current state
   */
  getState(): HighlightSystemState {
    return { ...this.state };
  }

  /**
   * Update internal state and maintain immutability
   */
  private updateState(partial: Partial<HighlightSystemState>): void {
    this.state = { ...this.state, ...partial };
  }
}
