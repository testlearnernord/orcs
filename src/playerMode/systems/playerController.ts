/**
 * Player controller system for movement, actions, and stamina management
 */

import { BALANCE } from '../../simulation/archetypes';
import type { Point2D } from '../../combat/hitbox';
import { angle, withinArc } from '../../combat/hitbox';
import type { KeybindState } from '../input/keybinds';
import { LockOnManager, type LockOnTarget } from '../lockon/LockOnManager';
import { LockOnInputHandler } from '../lockon/lockOnInput';
import {
  orbitVelocity,
  inputToOrbitValues,
  dirFromAngle
} from './orbitMovement';

export interface PlayerState {
  position: Point2D;
  rotation: number;
  stamina: number;
  isDashing: boolean;
  isBlocking: boolean;
  isInvulnerable: boolean;
  dashEndTime: number;
  iframeEndTime: number;
  lastStaminaUse: number;
  blockDirection: number;
  // New properties for enhanced berserker system
  motion: 'idle' | 'walk' | 'dash' | 'signature' | 'hurt';
  direction: 'L' | 'R' | 'U' | 'D';
  isLockedOn: boolean;
  lockOnTargetId?: string;
  speed: number;
  walkPhase: number;
}

export interface PlayerAction {
  type: 'move' | 'dash' | 'block' | 'signature' | 'attack';
  data?: any;
}

/**
 * Manages player character state and actions
 */
export class PlayerController {
  private state: PlayerState;
  private actions: PlayerAction[] = [];
  private lockOnManager: LockOnManager;
  private lockOnInputHandler: LockOnInputHandler;
  private availableTargets: LockOnTarget[] = [];
  private baseSpeed = 60; // px/s - reduced for more reasonable walking pace

  constructor(startPosition: Point2D = { x: 0, y: 0 }) {
    this.lockOnManager = new LockOnManager();
    this.lockOnInputHandler = new LockOnInputHandler();

    this.state = {
      position: { ...startPosition },
      rotation: 0,
      stamina: BALANCE.staminaMax,
      isDashing: false,
      isBlocking: false,
      isInvulnerable: false,
      dashEndTime: 0,
      iframeEndTime: 0,
      lastStaminaUse: 0,
      blockDirection: 0,
      // New properties
      motion: 'idle',
      direction: 'D',
      isLockedOn: false,
      speed: 0,
      walkPhase: 0
    };
  }

  /**
   * Get current player state
   */
  getState(): Readonly<PlayerState> {
    return { ...this.state };
  }

  /**
   * Get queued actions and clear them
   */
  getActions(): PlayerAction[] {
    const actions = [...this.actions];
    this.actions = [];
    return actions;
  }

  /**
   * Update player controller (call each frame)
   */
  update(deltaMs: number, input: KeybindState): void {
    const now = Date.now();
    const deltaSeconds = deltaMs / 1000;

    // Process lock-on input first
    this.processLockOn(input);

    // Update time-based states
    this.updateTimedStates(now);

    // Regenerate stamina
    this.updateStamina(deltaMs, now);

    // Process input with lock-on awareness
    this.processMovement(input, deltaSeconds);
    this.processDash(input, now);
    this.processBlock(input);
    this.processSignature(input, now);

    // Update motion state and direction
    this.updateMotionState();
    this.updateDirection();
  }

  /**
   * Check if player can block incoming attack
   */
  canBlockAttack(attackPosition: Point2D): boolean {
    if (!this.state.isBlocking || this.state.stamina < BALANCE.block.minCost) {
      return false;
    }

    // Check if attack is within block angle
    const attackAngle = angle(this.state.position, attackPosition);
    const blockAngle = this.state.blockDirection;
    const blockArcRadians = (BALANCE.block.angleDeg * Math.PI) / 180;

    return withinArc(blockAngle, attackAngle, blockArcRadians);
  }

  /**
   * Apply block to incoming damage
   */
  applyBlock(damage: number): { blockedDamage: number; staminaCost: number } {
    if (!this.canBlockAttack({ x: 0, y: 0 })) {
      // Position check already done
      return { blockedDamage: 0, staminaCost: 0 };
    }

    const staminaCost = Math.max(
      BALANCE.block.minCost,
      BALANCE.block.drainPerHit
    );
    if (this.state.stamina >= staminaCost) {
      this.state.stamina -= staminaCost;
      this.state.lastStaminaUse = Date.now();

      // Block reduces damage by 60%
      const blockedDamage = damage * 0.6;
      return { blockedDamage, staminaCost };
    }

    return { blockedDamage: 0, staminaCost: 0 };
  }

  /**
   * Reset player to initial state
   */
  reset(position?: Point2D): void {
    if (position) {
      this.state.position = { ...position };
    }
    this.state.rotation = 0;
    this.state.stamina = BALANCE.staminaMax;
    this.state.isDashing = false;
    this.state.isBlocking = false;
    this.state.isInvulnerable = false;
    this.state.dashEndTime = 0;
    this.state.iframeEndTime = 0;
    this.state.lastStaminaUse = 0;
    this.actions = [];
  }

  /**
   * Force stamina consumption (for external actions)
   */
  consumeStamina(amount: number): boolean {
    if (this.state.stamina >= amount) {
      this.state.stamina -= amount;
      this.state.lastStaminaUse = Date.now();
      return true;
    }
    return false;
  }

  private updateTimedStates(now: number): void {
    // Update dash state
    if (this.state.isDashing && now >= this.state.dashEndTime) {
      this.state.isDashing = false;
    }

    // Update invulnerability frames
    if (this.state.isInvulnerable && now >= this.state.iframeEndTime) {
      this.state.isInvulnerable = false;
    }
  }

  private updateStamina(deltaMs: number, now: number): void {
    // Don't regenerate during grace period after stamina use
    if (now - this.state.lastStaminaUse < BALANCE.regenDelayMs) {
      return;
    }

    const regenAmount = (BALANCE.staminaRegenPerSec * deltaMs) / 1000;
    this.state.stamina = Math.min(
      BALANCE.staminaMax,
      this.state.stamina + regenAmount
    );
  }

  private processMovement(input: KeybindState, deltaSeconds: number): void {
    const movement = this.getMovementVector(input);

    if (movement.x !== 0 || movement.y !== 0) {
      let velocity: Point2D;
      let speed: number;

      // Check if lock-on is active and we have a target
      const lockOnTarget = this.getCurrentLockOnTarget();
      if (this.state.isLockedOn && lockOnTarget) {
        // Use orbit movement
        const orbitInput = inputToOrbitValues({
          moveUp: input.moveUp,
          moveDown: input.moveDown,
          moveLeft: input.moveLeft,
          moveRight: input.moveRight
        });

        speed = this.state.isDashing
          ? this.baseSpeed * BALANCE.dash.speedMul
          : this.baseSpeed;
        velocity = orbitVelocity(
          orbitInput,
          this.state.position,
          lockOnTarget.pos,
          speed
        );
      } else {
        // Standard world-relative movement
        this.state.rotation = Math.atan2(movement.y, movement.x);
        speed = this.state.isDashing
          ? this.baseSpeed * BALANCE.dash.speedMul
          : this.baseSpeed;
        velocity = {
          x: movement.x * speed,
          y: movement.y * speed
        };
      }

      this.state.position.x += velocity.x * deltaSeconds;
      this.state.position.y += velocity.y * deltaSeconds;
      this.state.speed = speed;

      // Update walk phase for distance-coupled animation
      if (!this.state.isDashing) {
        this.state.walkPhase =
          (this.state.walkPhase + (speed * deltaSeconds) / (40 * 8)) % 1;
      }

      this.actions.push({
        type: 'move',
        data: { position: this.state.position, rotation: this.state.rotation }
      });
    } else {
      this.state.speed = 0;
    }
  }

  private processDash(input: KeybindState, now: number): void {
    if (
      input.dash &&
      !this.state.isDashing &&
      this.state.stamina >= BALANCE.dash.cost
    ) {
      this.state.stamina -= BALANCE.dash.cost;
      this.state.lastStaminaUse = now;
      this.state.isDashing = true;
      this.state.isInvulnerable = true;
      this.state.dashEndTime = now + BALANCE.dash.durMs;
      this.state.iframeEndTime = now + BALANCE.dash.iframeMs;

      this.actions.push({
        type: 'dash',
        data: { direction: this.state.rotation }
      });
    }
  }

  private processBlock(input: KeybindState): void {
    const wasBlocking = this.state.isBlocking;
    this.state.isBlocking =
      input.block && this.state.stamina >= BALANCE.block.minCost;

    if (this.state.isBlocking) {
      this.state.blockDirection = this.state.rotation;
    }

    if (this.state.isBlocking !== wasBlocking) {
      this.actions.push({
        type: 'block',
        data: {
          blocking: this.state.isBlocking,
          direction: this.state.blockDirection
        }
      });
    }
  }

  private processSignature(input: KeybindState, _now: number): void {
    if (input.signature) {
      this.actions.push({
        type: 'signature',
        data: { position: this.state.position, rotation: this.state.rotation }
      });
    }
  }

  /**
   * Process lock-on input and manage target acquisition
   */
  private processLockOn(input: KeybindState): void {
    // Convert KeybindState to the format expected by LockOnInputHandler
    const keyState: { [key: string]: boolean } = {
      AltLeft: input.lockOn || false, // assuming lockOn is added to KeybindState
      KeyQ: input.cycleLeft || false, // assuming cycleLeft is added
      KeyE: input.cycleRight || false // assuming cycleRight is added
    };

    const lockOnInput = this.lockOnInputHandler.processInput(keyState);

    // Handle lock-on toggle
    if (lockOnInput.toggleLockOn) {
      if (this.state.isLockedOn) {
        // Clear lock-on
        this.lockOnManager.clear();
        this.state.isLockedOn = false;
        this.state.lockOnTargetId = undefined;
      } else {
        // Acquire new target
        const targetId = this.lockOnManager.acquire(
          this.availableTargets,
          this.state.position,
          this.state.rotation
        );
        if (targetId) {
          this.lockOnManager.current = targetId;
          this.state.isLockedOn = true;
          this.state.lockOnTargetId = targetId;
        }
      }
    }

    // Handle target cycling
    if (
      this.state.isLockedOn &&
      (lockOnInput.cycleLeft || lockOnInput.cycleRight)
    ) {
      const direction = lockOnInput.cycleLeft ? -1 : 1;
      const targetId = this.lockOnManager.cycle(
        this.availableTargets,
        direction,
        this.state.position
      );
      if (targetId) {
        this.lockOnManager.current = targetId;
        this.state.lockOnTargetId = targetId;
      }
    }
  }

  /**
   * Update motion state based on current actions
   */
  private updateMotionState(): void {
    if (this.state.isDashing) {
      this.state.motion = 'dash';
    } else if (this.actions.some((a) => a.type === 'signature')) {
      this.state.motion = 'signature';
    } else if (this.state.speed > 0) {
      this.state.motion = 'walk';
    } else {
      this.state.motion = 'idle';
    }
  }

  /**
   * Update direction based on rotation or lock-on target
   */
  private updateDirection(): void {
    if (this.state.isLockedOn && this.state.lockOnTargetId) {
      // Find the locked target
      const lockedTarget = this.availableTargets.find(
        (t) => t.id === this.state.lockOnTargetId
      );
      if (lockedTarget) {
        const targetAngle = angle(this.state.position, lockedTarget.pos);
        this.state.direction = dirFromAngle(targetAngle);
        this.state.rotation = targetAngle; // Also update rotation to face target
        return;
      }
    }

    // Default: use rotation to determine direction
    this.state.direction = dirFromAngle(this.state.rotation);
  }

  /**
   * Set available targets for lock-on system
   */
  public setAvailableTargets(targets: LockOnTarget[]): void {
    this.availableTargets = targets;

    // Clear lock-on if current target is no longer available
    if (
      this.state.lockOnTargetId &&
      !targets.find((t) => t.id === this.state.lockOnTargetId && t.alive)
    ) {
      this.lockOnManager.clear();
      this.state.isLockedOn = false;
      this.state.lockOnTargetId = undefined;
    }
  }

  /**
   * Get current lock-on target
   */
  public getCurrentLockOnTarget(): LockOnTarget | undefined {
    if (!this.state.lockOnTargetId) return undefined;
    return this.availableTargets.find(
      (t) => t.id === this.state.lockOnTargetId
    );
  }

  private getMovementVector(input: KeybindState): Point2D {
    let x = 0;
    let y = 0;

    if (input.moveLeft) x -= 1;
    if (input.moveRight) x += 1;
    if (input.moveUp) y -= 1;
    if (input.moveDown) y += 1;

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }

    return { x, y };
  }
}
