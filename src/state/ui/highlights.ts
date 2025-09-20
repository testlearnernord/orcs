import type { Highlight } from '@state/cycleDigest';
import { EventBus } from '@state/eventBus';

export interface HighlightState {
  queue: Highlight[];
  showing: Highlight | null;
  history: Highlight[][];
}

interface HighlightEvents extends Record<string, HighlightState> {
  change: HighlightState;
}

const MAX_QUEUE = 6;
const HISTORY_LIMIT = 12;

function summarizeOverflow(cycle: number, extra: Highlight[]): Highlight {
  const count = extra.length;
  return {
    id: `overflow:${cycle}`,
    icon: '➕',
    title: `+${count} weitere`,
    text: count === 1 ? 'Weitere Meldung im Log.' : 'Weitere Meldungen im Log.',
    score: extra[extra.length - 1]?.score ?? 0,
    cycle
  };
}

export class HighlightStore extends EventBus<HighlightEvents> {
  private state: HighlightState = { queue: [], showing: null, history: [] };

  getState(): HighlightState {
    return this.state;
  }

  enqueue(cycle: number, entries: Highlight[]): void {
    if (entries.length === 0) return;
    const sorted = [...entries].sort(
      (a, b) => b.score - a.score || a.id.localeCompare(b.id)
    );
    const trimmed = sorted.slice(0, MAX_QUEUE);
    if (sorted.length > MAX_QUEUE) {
      trimmed.push(summarizeOverflow(cycle, sorted.slice(MAX_QUEUE)));
    }
    const pending = [...this.state.queue, ...trimmed];
    const history = [sorted, ...this.state.history].slice(0, HISTORY_LIMIT);
    let showing = this.state.showing;
    let queue = pending;
    if (!showing && queue.length > 0) {
      [showing, ...queue] = queue;
    }
    this.updateState({ showing, queue, history });
  }

  advance(): void {
    if (this.state.queue.length === 0) {
      this.updateState({ ...this.state, showing: null });
      return;
    }
    const [showing, ...queue] = this.state.queue;
    this.updateState({ ...this.state, showing, queue });
  }

  clear(): void {
    this.updateState({ ...this.state, queue: [], showing: null });
  }

  private updateState(partial: Partial<HighlightState> | HighlightState): void {
    const next: HighlightState =
      'queue' in partial && 'showing' in partial && 'history' in partial
        ? (partial as HighlightState)
        : { ...this.state, ...partial };
    this.state = next;
    this.emit('change', this.state);
  }
}
