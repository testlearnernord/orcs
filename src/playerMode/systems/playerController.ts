/**
 * Player controller system for movement, actions, and stamina management
 */

import { BALANCE } from '../../simulation/archetypes';
import type { Point2D } from '../../combat/hitbox';
import { angle, withinArc } from '../../combat/hitbox';
import type { KeybindState } from '../input/keybinds';

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

  constructor(startPosition: Point2D = { x: 0, y: 0 }) {
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
      blockDirection: 0
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

    // Update time-based states
    this.updateTimedStates(now);
    
    // Regenerate stamina
    this.updateStamina(deltaMs, now);
    
    // Process input
    this.processMovement(input, deltaSeconds);
    this.processDash(input, now);
    this.processBlock(input);
    this.processSignature(input, now);
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
    if (!this.canBlockAttack({ x: 0, y: 0 })) { // Position check already done
      return { blockedDamage: 0, staminaCost: 0 };
    }

    const staminaCost = Math.max(BALANCE.block.minCost, BALANCE.block.drainPerHit);
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
    this.state.stamina = Math.min(BALANCE.staminaMax, this.state.stamina + regenAmount);
  }

  private processMovement(input: KeybindState, deltaSeconds: number): void {
    const movement = this.getMovementVector(input);
    
    if (movement.x !== 0 || movement.y !== 0) {
      // Update rotation to face movement direction
      this.state.rotation = Math.atan2(movement.y, movement.x);

      // Apply movement speed
      const speed = this.state.isDashing ? 
        BALANCE.dash.speedMul * 2.5 : 2.5; // Base movement speed
      
      this.state.position.x += movement.x * speed * deltaSeconds;
      this.state.position.y += movement.y * speed * deltaSeconds;

      this.actions.push({
        type: 'move',
        data: { position: this.state.position, rotation: this.state.rotation }
      });
    }
  }

  private processDash(input: KeybindState, now: number): void {
    if (input.dash && !this.state.isDashing && this.state.stamina >= BALANCE.dash.cost) {
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
    this.state.isBlocking = input.block && this.state.stamina >= BALANCE.block.minCost;
    
    if (this.state.isBlocking) {
      this.state.blockDirection = this.state.rotation;
    }

    if (this.state.isBlocking !== wasBlocking) {
      this.actions.push({
        type: 'block',
        data: { blocking: this.state.isBlocking, direction: this.state.blockDirection }
      });
    }
  }

  private processSignature(input: KeybindState, now: number): void {
    if (input.signature) {
      this.actions.push({
        type: 'signature',
        data: { position: this.state.position, rotation: this.state.rotation }
      });
    }
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