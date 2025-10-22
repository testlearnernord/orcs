import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { CycleHoldIndicator } from '@ui/components/cycleHoldIndicator';

describe('CycleHoldIndicator', () => {
  let indicator: CycleHoldIndicator;

  afterEach(() => {
    if (indicator) {
      indicator.dispose();
    }
  });

  it('should create indicator element in DOM', () => {
    indicator = new CycleHoldIndicator();
    const element = document.querySelector('.cycle-hold-indicator');
    expect(element).toBeTruthy();
    expect(element?.classList.contains('hidden')).toBe(true);
  });

  it('should show indicator when started', () => {
    indicator = new CycleHoldIndicator();
    indicator.start();
    const element = document.querySelector('.cycle-hold-indicator');
    expect(element?.classList.contains('hidden')).toBe(false);
  });

  it('should hide indicator when cancelled', () => {
    indicator = new CycleHoldIndicator();
    indicator.start();
    indicator.cancel();
    const element = document.querySelector('.cycle-hold-indicator');
    expect(element?.classList.contains('hidden')).toBe(true);
  });

  it('should call onComplete callback when provided', async () => {
    const onComplete = vi.fn();
    indicator = new CycleHoldIndicator({
      holdDuration: 100, // Short duration for test
      onComplete
    });

    indicator.start();
    expect(onComplete).not.toHaveBeenCalled();

    // Wait for the duration to complete
    await new Promise((resolve) => setTimeout(resolve, 150));

    // onComplete should be called
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancelled before completion', () => {
    const onCancel = vi.fn();
    const onComplete = vi.fn();
    indicator = new CycleHoldIndicator({
      holdDuration: 3000,
      onComplete,
      onCancel
    });

    indicator.start();
    indicator.cancel();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('should prevent multiple simultaneous starts', () => {
    indicator = new CycleHoldIndicator({
      holdDuration: 3000
    });

    indicator.start();
    expect(indicator.isShowing()).toBe(true);
    
    indicator.start(); // Try to start again
    indicator.start(); // And again

    // Should still be showing (not restarted)
    expect(indicator.isShowing()).toBe(true);
  });

  it('should cleanup properly when disposed', () => {
    indicator = new CycleHoldIndicator();
    indicator.start();

    const element = document.querySelector('.cycle-hold-indicator');
    expect(element).toBeTruthy();

    indicator.dispose();

    // Element should be removed from DOM
    const elementAfterDispose = document.querySelector(
      '.cycle-hold-indicator'
    );
    expect(elementAfterDispose).toBeNull();
  });
});
