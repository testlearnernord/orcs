/**
 * Input handling for lock-on system
 * Manages Alt (toggle), Q/E (cycling) input detection
 */

export interface LockOnInput {
  toggleLockOn: boolean;
  cycleLeft: boolean;
  cycleRight: boolean;
}

export class LockOnInputHandler {
  private previousState: LockOnInput = {
    toggleLockOn: false,
    cycleLeft: false,
    cycleRight: false
  };

  /**
   * Process keyboard state and return lock-on input events
   */
  processInput(keyState: { [key: string]: boolean }): LockOnInput {
    const currentState: LockOnInput = {
      toggleLockOn: keyState['AltLeft'] || keyState['AltRight'] || false,
      cycleLeft: keyState['KeyQ'] || false,
      cycleRight: keyState['KeyE'] || false
    };

    // Detect rising edges (key just pressed)
    const result: LockOnInput = {
      toggleLockOn:
        currentState.toggleLockOn && !this.previousState.toggleLockOn,
      cycleLeft: currentState.cycleLeft && !this.previousState.cycleLeft,
      cycleRight: currentState.cycleRight && !this.previousState.cycleRight
    };

    this.previousState = currentState;
    return result;
  }

  /**
   * Reset input state (useful for when focus is lost)
   */
  reset(): void {
    this.previousState = {
      toggleLockOn: false,
      cycleLeft: false,
      cycleRight: false
    };
  }
}
