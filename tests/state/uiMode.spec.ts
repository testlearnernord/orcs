import { describe, expect, it, vi } from 'vitest';

import { UIModeStore } from '@state/ui/mode';

describe('UIModeStore', () => {
  it('starts in spectate mode without player', () => {
    const store = new UIModeStore();
    const state = store.getState();
    expect(state.mode).toBe('spectate');
    expect(state.playerId).toBeNull();
  });

  it('emits changes when switching mode', () => {
    const store = new UIModeStore();
    const listener = vi.fn();
    store.on('mode:changed', listener);
    store.setMode('player', 'hero');
    expect(store.getState()).toEqual({ mode: 'player', playerId: 'hero' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ mode: 'player', playerId: 'hero' });
  });

  it('resets playerId when switching back to spectate', () => {
    const store = new UIModeStore();
    store.setMode('player', 'hero');
    store.setMode('spectate');
    expect(store.getState()).toEqual({ mode: 'spectate', playerId: null });
  });
});
