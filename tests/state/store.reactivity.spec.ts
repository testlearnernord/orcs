import { describe, expect, it } from 'vitest';
import { GameStore } from '@state/store';

describe('GameStore Reactivity', () => {
  it('creates a new state reference after tick()', () => {
    const store = new GameStore('reactivity-test');
    const initialState = store.getState();
    const initialVersion = initialState.version;
    const initialCycle = initialState.cycle;

    // Advance the cycle
    const summary = store.tick();

    // Get the new state
    const newState = store.getState();

    // State reference should be different
    expect(newState).not.toBe(initialState);

    // Version should be incremented
    expect(newState.version).toBe(initialVersion + 1);

    // Cycle should be incremented
    expect(newState.cycle).toBe(initialCycle + 1);

    // updatedAt should be set
    expect(newState.updatedAt).toBeTypeOf('number');
    expect(newState.updatedAt).toBeGreaterThan(0);

    // Officers array should be a new reference
    expect(newState.officers).not.toBe(initialState.officers);

    // Officers count should remain stable or change based on simulation
    expect(newState.officers.length).toBeGreaterThanOrEqual(15); // Minimum expected officers

    // Summary should reflect the changes
    expect(summary.cycle).toBe(newState.cycle);
  });

  it('emits state:changed event with new state after tick()', () => {
    const store = new GameStore('reactivity-event-test');
    let eventReceived = false;
    let receivedState: any = null;

    store.events.on('state:changed', (state) => {
      eventReceived = true;
      receivedState = state;
    });

    const initialState = store.getState();
    store.tick();
    const newState = store.getState();

    expect(eventReceived).toBe(true);
    expect(receivedState).toBe(newState);
    expect(receivedState).not.toBe(initialState);
  });

  it('creates new state reference after scheduleWarcall() when successful', () => {
    const store = new GameStore('warcall-reactivity-test');
    const initialState = store.getState();
    const initialVersion = initialState.version;
    const initialWarcallCount = initialState.warcalls.length;

    // Schedule a warcall
    const plan = store.scheduleWarcall();

    // The test should only run if warcall was successfully created
    if (plan) {
      const newState = store.getState();
      const newWarcallCount = newState.warcalls.length;

      // State reference should be different
      expect(newState).not.toBe(initialState);

      // Version should be incremented
      expect(newState.version).toBe(initialVersion + 1);

      // Warcalls array should be a new reference
      expect(newState.warcalls).not.toBe(initialState.warcalls);

      // Should have one more warcall
      expect(newWarcallCount).toBe(initialWarcallCount + 1);
    } else {
      // If no warcall was scheduled, state should remain the same
      const newState = store.getState();
      expect(newState).toBe(initialState);
      expect(newState.version).toBe(initialVersion);
    }
  });
});
