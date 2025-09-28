/**
 * Lock-on manager for targeting enemies in combat
 * Implements soulslike lock-on mechanics with target acquisition and cycling
 */

import type { Point2D } from '../../combat/hitbox';
import { distance, angle } from '../../combat/hitbox';

export interface LockOnTarget {
  id: string;
  pos: { x: number; y: number };
  alive: boolean;
}

export class LockOnManager {
  public current?: string;
  private lockRadius = 900; // px

  constructor() {
    this.current = undefined;
  }

  /**
   * Acquire the best target based on angle and distance preferences
   */
  acquire(
    candidates: LockOnTarget[],
    playerPos: Point2D,
    playerDir: number
  ): string | undefined {
    if (candidates.length === 0) return undefined;

    const validTargets = candidates.filter((target) => target.alive);
    if (validTargets.length === 0) return undefined;

    // Filter by lock radius
    const inRangeTargets = validTargets.filter(
      (target) => distance(playerPos, target.pos) <= this.lockRadius
    );

    if (inRangeTargets.length === 0) return undefined;

    // Score targets by angle and distance
    const scoredTargets = inRangeTargets.map((target) => {
      const dist = distance(playerPos, target.pos);
      const targetAngle = angle(playerPos, target.pos);
      const angleDiff = Math.abs(targetAngle - playerDir);
      const normalizedAngleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);

      // Prefer smaller angle difference, use distance as tiebreaker
      const score = normalizedAngleDiff + (dist / this.lockRadius) * 0.1;

      return { target, score };
    });

    // Sort by score (lower is better)
    scoredTargets.sort((a, b) => a.score - b.score);

    return scoredTargets[0]?.target.id;
  }

  /**
   * Cycle through targets in ring order around the player
   */
  cycle(
    candidates: LockOnTarget[],
    direction: 1 | -1,
    playerPos: Point2D
  ): string | undefined {
    if (candidates.length === 0) return undefined;

    const validTargets = candidates.filter((target) => target.alive);
    if (validTargets.length === 0) return undefined;

    const inRangeTargets = validTargets.filter(
      (target) => distance(playerPos, target.pos) <= this.lockRadius
    );

    if (inRangeTargets.length === 0) return undefined;
    if (inRangeTargets.length === 1) return inRangeTargets[0].id;

    // Sort targets by angle around player
    const angledTargets = inRangeTargets.map((target) => ({
      target,
      angle: angle(playerPos, target.pos)
    }));

    angledTargets.sort((a, b) => a.angle - b.angle);

    if (!this.current) {
      // No current target, select first
      return angledTargets[0].target.id;
    }

    // Find current target index
    const currentIndex = angledTargets.findIndex(
      (t) => t.target.id === this.current
    );
    if (currentIndex === -1) {
      // Current target not found, select first
      return angledTargets[0].target.id;
    }

    // Calculate next index with wrapping
    const nextIndex =
      (currentIndex + direction + angledTargets.length) % angledTargets.length;
    return angledTargets[nextIndex].target.id;
  }

  /**
   * Clear current lock-on target
   */
  clear(): void {
    this.current = undefined;
  }

  /**
   * Set lock-on radius
   */
  setLockRadius(radius: number): void {
    this.lockRadius = Math.max(100, radius);
  }

  /**
   * Get current lock radius
   */
  getLockRadius(): number {
    return this.lockRadius;
  }
}
