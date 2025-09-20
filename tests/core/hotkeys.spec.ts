import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { disposeHotkeys, initHotkeys, registerHotkey } from '@core/hotkeys';

describe('hotkeys', () => {
  beforeEach(() => {
    initHotkeys();
  });

  afterEach(() => {
    disposeHotkeys();
  });

  it('invokes registered handlers on matching key press', () => {
    let calls = 0;
    registerHotkey('x', () => {
      calls += 1;
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    expect(calls).toBe(1);
  });

  it('ignores key presses while typing in inputs', () => {
    let calls = 0;
    registerHotkey('z', () => {
      calls += 1;
    });
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', bubbles: true })
    );
    expect(calls).toBe(0);
    input.blur();
    input.remove();
  });
});
