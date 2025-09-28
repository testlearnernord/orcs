/**
 * Player Mode keybind system for combat controls
 */

export interface KeybindState {
  // Movement (WASD)
  moveUp: boolean;
  moveDown: boolean;
  moveLeft: boolean;
  moveRight: boolean;

  // Combat actions
  dash: boolean; // Shift
  block: boolean; // Ctrl
  lockOn: boolean; // Alt (toggle)
  signature: boolean; // E
  reset: boolean; // R

  // Internal state
  lockOnToggled: boolean;
  lastLockOnState: boolean;
}

export type KeybindCallback = (
  action: keyof KeybindState,
  pressed: boolean
) => void;

/**
 * Manager for player input handling
 */
export class PlayerKeybinds {
  private state: KeybindState;
  private callbacks: KeybindCallback[] = [];
  private keyMap: Record<string, keyof KeybindState> = {
    w: 'moveUp',
    a: 'moveLeft',
    s: 'moveDown',
    d: 'moveRight',
    shift: 'dash',
    control: 'block',
    alt: 'lockOn',
    e: 'signature',
    r: 'reset'
  };

  constructor() {
    this.state = {
      moveUp: false,
      moveDown: false,
      moveLeft: false,
      moveRight: false,
      dash: false,
      block: false,
      lockOn: false,
      signature: false,
      reset: false,
      lockOnToggled: false,
      lastLockOnState: false
    };

    this.bindEvents();
  }

  /**
   * Get current input state
   */
  getState(): Readonly<KeybindState> {
    return { ...this.state };
  }

  /**
   * Add callback for input changes
   */
  onInput(callback: KeybindCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index >= 0) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get movement vector from current input state
   */
  getMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.state.moveLeft) x -= 1;
    if (this.state.moveRight) x += 1;
    if (this.state.moveUp) y -= 1;
    if (this.state.moveDown) y += 1;

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }

    return { x, y };
  }

  /**
   * Check if any movement key is pressed
   */
  isMoving(): boolean {
    return (
      this.state.moveUp ||
      this.state.moveDown ||
      this.state.moveLeft ||
      this.state.moveRight
    );
  }

  /**
   * Update input state (call each frame to handle toggle logic)
   */
  update(): void {
    // Handle lock-on toggle logic
    if (this.state.lockOn && !this.state.lastLockOnState) {
      this.state.lockOnToggled = !this.state.lockOnToggled;
    }
    this.state.lastLockOnState = this.state.lockOn;
  }

  /**
   * Reset all input state
   */
  reset(): void {
    for (const key in this.state) {
      (this.state as any)[key] = false;
    }
  }

  /**
   * Cleanup event listeners
   */
  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
    }
  }

  private bindEvents(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    const action = this.keyMap[key];

    if (action && !this.state[action]) {
      this.updateKeyState(action, true);
      event.preventDefault();
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    const action = this.keyMap[key];

    if (action && this.state[action]) {
      this.updateKeyState(action, false);
      event.preventDefault();
    }
  };

  private handleBlur = (): void => {
    // Reset all keys when window loses focus
    for (const action in this.state) {
      if (this.state[action as keyof KeybindState]) {
        this.updateKeyState(action as keyof KeybindState, false);
      }
    }
  };

  private updateKeyState(action: keyof KeybindState, pressed: boolean): void {
    if (this.state[action] !== pressed) {
      this.state[action] = pressed as any;

      // Notify callbacks
      for (const callback of this.callbacks) {
        callback(action, pressed);
      }
    }
  }
}
