/**
 * Camera system for player mode with smooth following and lock-on support
 */

import type { Point2D } from '../../combat/hitbox';

export interface CameraState {
  position: Point2D;
  targetPosition: Point2D;
  followSpeed: number;
  lockOnTarget?: Point2D;
  lockOnStrength: number;
}

/**
 * Manages camera positioning and smooth following
 */
export class CameraController {
  private state: CameraState;

  constructor(initialPosition: Point2D = { x: 0, y: 0 }) {
    this.state = {
      position: { ...initialPosition },
      targetPosition: { ...initialPosition },
      followSpeed: 5.0,
      lockOnStrength: 0.3
    };
  }

  /**
   * Get current camera state
   */
  getState(): Readonly<CameraState> {
    return { ...this.state };
  }

  /**
   * Set camera target position (usually player position)
   */
  setTarget(position: Point2D): void {
    this.state.targetPosition = { ...position };
  }

  /**
   * Set lock-on target for camera offset
   */
  setLockOnTarget(target: Point2D | undefined): void {
    this.state.lockOnTarget = target ? { ...target } : undefined;
  }

  /**
   * Update camera (call each frame)
   */
  update(deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;
    
    // Calculate final target position with lock-on offset
    let finalTarget = { ...this.state.targetPosition };
    
    if (this.state.lockOnTarget) {
      // Add slight offset towards lock-on target
      const offsetX = (this.state.lockOnTarget.x - this.state.targetPosition.x) * this.state.lockOnStrength;
      const offsetY = (this.state.lockOnTarget.y - this.state.targetPosition.y) * this.state.lockOnStrength;
      
      finalTarget.x += offsetX;
      finalTarget.y += offsetY;
    }

    // Smooth interpolation towards target
    const lerpSpeed = this.state.followSpeed * deltaSeconds;
    const dx = finalTarget.x - this.state.position.x;
    const dy = finalTarget.y - this.state.position.y;

    this.state.position.x += dx * lerpSpeed;
    this.state.position.y += dy * lerpSpeed;
  }

  /**
   * Instantly snap camera to position (for reset)
   */
  snapTo(position: Point2D): void {
    this.state.position = { ...position };
    this.state.targetPosition = { ...position };
  }

  /**
   * Get camera position for rendering
   */
  getPosition(): Point2D {
    return { ...this.state.position };
  }

  /**
   * Set camera follow speed
   */
  setFollowSpeed(speed: number): void {
    this.state.followSpeed = Math.max(0.1, speed);
  }

  /**
   * Set lock-on influence strength
   */
  setLockOnStrength(strength: number): void {
    this.state.lockOnStrength = Math.max(0, Math.min(1, strength));
  }
}