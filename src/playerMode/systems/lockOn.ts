/**
 * Lock-on system for targeting enemies in combat
 */

import type { Point2D } from '../../combat/hitbox';
import { distance, angle, withinArc } from '../../combat/hitbox';

export interface LockOnTarget {
  id: string;
  position: Point2D;
  isAlive: boolean;
}

export interface LockOnState {
  currentTarget?: string;
  targets: LockOnTarget[];
  maxRange: number;
  forwardConeAngle: number;
}

/**
 * Manages target lock-on for combat
 */
export class LockOnController {
  private state: LockOnState;

  constructor() {
    this.state = {
      targets: [],
      maxRange: 8.0,
      forwardConeAngle: Math.PI * 0.75 // 135 degrees
    };
  }

  /**
   * Get current lock-on state
   */
  getState(): Readonly<LockOnState> {
    return {
      ...this.state,
      targets: [...this.state.targets]
    };
  }

  /**
   * Get current target info
   */
  getCurrentTarget(): LockOnTarget | undefined {
    if (!this.state.currentTarget) return undefined;
    return this.state.targets.find(t => t.id === this.state.currentTarget);
  }

  /**
   * Update available targets
   */
  updateTargets(targets: LockOnTarget[]): void {
    this.state.targets = targets.filter(t => t.isAlive);
    
    // Clear current target if it's no longer available
    if (this.state.currentTarget) {
      const currentExists = this.state.targets.some(t => t.id === this.state.currentTarget);
      if (!currentExists) {
        this.state.currentTarget = undefined;
      }
    }
  }

  /**
   * Toggle lock-on (finds next target or clears current)
   */
  toggleLockOn(playerPosition: Point2D, playerRotation: number): boolean {
    if (this.state.currentTarget) {
      // Clear current lock-on
      this.state.currentTarget = undefined;
      return false;
    } else {
      // Find next target
      const target = this.findNextTarget(playerPosition, playerRotation);
      if (target) {
        this.state.currentTarget = target.id;
        return true;
      }
      return false;
    }
  }

  /**
   * Manually set lock-on target
   */
  setTarget(targetId: string | undefined): boolean {
    if (!targetId) {
      this.state.currentTarget = undefined;
      return true;
    }

    const target = this.state.targets.find(t => t.id === targetId);
    if (target) {
      this.state.currentTarget = targetId;
      return true;
    }
    return false;
  }

  /**
   * Clear current lock-on
   */
  clearTarget(): void {
    this.state.currentTarget = undefined;
  }

  /**
   * Update system (call each frame to validate targets)
   */
  update(playerPosition: Point2D): void {
    // Validate current target is still in range
    if (this.state.currentTarget) {
      const target = this.getCurrentTarget();
      if (!target || !this.isTargetValid(playerPosition, target)) {
        this.state.currentTarget = undefined;
      }
    }
  }

  /**
   * Get position of current target (for camera offset)
   */
  getTargetPosition(): Point2D | undefined {
    const target = this.getCurrentTarget();
    return target ? { ...target.position } : undefined;
  }

  /**
   * Check if currently locked on
   */
  hasTarget(): boolean {
    return this.state.currentTarget !== undefined;
  }

  /**
   * Get all valid targets in range for UI display
   */
  getValidTargets(playerPosition: Point2D, playerRotation: number): LockOnTarget[] {
    return this.state.targets.filter(target => 
      this.isTargetInCone(playerPosition, playerRotation, target) &&
      this.isTargetInRange(playerPosition, target)
    );
  }

  private findNextTarget(playerPosition: Point2D, playerRotation: number): LockOnTarget | undefined {
    const validTargets = this.getValidTargets(playerPosition, playerRotation);
    
    if (validTargets.length === 0) return undefined;

    // Sort by distance, prefer closest
    validTargets.sort((a, b) => {
      const distA = distance(playerPosition, a.position);
      const distB = distance(playerPosition, b.position);
      return distA - distB;
    });

    return validTargets[0];
  }

  private isTargetValid(playerPosition: Point2D, target: LockOnTarget): boolean {
    return target.isAlive && this.isTargetInRange(playerPosition, target);
  }

  private isTargetInRange(playerPosition: Point2D, target: LockOnTarget): boolean {
    return distance(playerPosition, target.position) <= this.state.maxRange;
  }

  private isTargetInCone(playerPosition: Point2D, playerRotation: number, target: LockOnTarget): boolean {
    const targetAngle = angle(playerPosition, target.position);
    return withinArc(playerRotation, targetAngle, this.state.forwardConeAngle);
  }

  /**
   * Set lock-on range
   */
  setRange(range: number): void {
    this.state.maxRange = Math.max(1.0, range);
  }

  /**
   * Set forward cone angle
   */
  setConeAngle(angleRadians: number): void {
    this.state.forwardConeAngle = Math.max(0.1, Math.min(Math.PI * 2, angleRadians));
  }
}