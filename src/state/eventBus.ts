export type EventMap = Record<string, unknown>;

export type EventListener<T> = (payload: T) => void;

/**
 * Lightweight event bus used by the sim and UI to communicate without
 * introducing cyclic dependencies. The implementation intentionally keeps a
 * minimal API (on/emit/off) so it is easy to reason about inside tests.
 */
export class EventBus<TEvents extends EventMap> {
  private readonly listeners = new Map<
    keyof TEvents,
    Set<EventListener<any>>
  >();

  on<TKey extends keyof TEvents>(
    event: TKey,
    listener: EventListener<TEvents[TKey]>
  ): () => void {
    const existing = this.listeners.get(event) ?? new Set();
    existing.add(listener as EventListener<any>);
    this.listeners.set(event, existing);
    return () => this.off(event, listener);
  }

  off<TKey extends keyof TEvents>(
    event: TKey,
    listener: EventListener<TEvents[TKey]>
  ): void {
    const existing = this.listeners.get(event);
    if (!existing) return;
    existing.delete(listener as EventListener<any>);
    if (existing.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit<TKey extends keyof TEvents>(event: TKey, payload: TEvents[TKey]): void {
    const existing = this.listeners.get(event);
    if (!existing) return;
    existing.forEach((listener) => {
      listener(payload);
    });
  }
}
