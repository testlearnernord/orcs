/**
 * LPC Animation Controller
 * Handles frame-based animations according to LPC standards
 */

import {
  LPCAnimation,
  LPCDirection,
  LPC_DIRECTION_ROWS,
  LPC_FRAME_COUNTS,
  LPC_FRAME_TIMING
} from './types';

export interface LPCAnimationFrame {
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LPCAnimationState {
  animation: LPCAnimation;
  direction: LPCDirection;
  frame: number;
  startTime: number;
  loop: boolean;
}

/**
 * LPC-compliant animation controller that manages frame sequencing
 * according to the Universal LPC Spritesheet Generator standard
 */
export class LPCAnimator {
  private currentState: LPCAnimationState | null = null;
  private frameWidth: number = 64;
  private frameHeight: number = 64;

  constructor(frameWidth: number = 64, frameHeight: number = 64) {
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
  }

  /**
   * Start playing an LPC animation
   */
  play(
    animation: LPCAnimation,
    direction: LPCDirection,
    loop: boolean = true
  ): void {
    this.currentState = {
      animation,
      direction,
      frame: 0,
      startTime: Date.now(),
      loop
    };
  }

  /**
   * Update animation state - call every frame
   */
  update(): void {
    if (!this.currentState) return;

    const now = Date.now();
    const elapsed = now - this.currentState.startTime;
    const frameTime = LPC_FRAME_TIMING[this.currentState.animation];
    const totalFrames = LPC_FRAME_COUNTS[this.currentState.animation];

    const targetFrame = Math.floor(elapsed / frameTime);

    if (targetFrame >= totalFrames) {
      if (this.currentState.loop) {
        // Loop back to start
        this.currentState.frame = targetFrame % totalFrames;
        this.currentState.startTime =
          now - (elapsed % (frameTime * totalFrames));
      } else {
        // Stay on last frame
        this.currentState.frame = totalFrames - 1;
      }
    } else {
      this.currentState.frame = targetFrame;
    }
  }

  /**
   * Get the current animation frame for rendering
   */
  getCurrentFrame(): LPCAnimationFrame | null {
    if (!this.currentState) return null;

    const row = LPC_DIRECTION_ROWS[this.currentState.direction];
    const col = this.currentState.frame;

    console.log(
      `[LPCAnimator] Direction: ${this.currentState.direction}, Row: ${row}, Col: ${col}, Animation: ${this.currentState.animation}`
    );

    return {
      col,
      row,
      x: col * this.frameWidth,
      y: row * this.frameHeight,
      width: this.frameWidth,
      height: this.frameHeight
    };
  }

  /**
   * Check if current animation is finished (for non-looping animations)
   */
  isFinished(): boolean {
    if (!this.currentState) return true; // No animation = finished
    if (this.currentState.loop) return false; // Looping animations are never "finished"

    const totalFrames = LPC_FRAME_COUNTS[this.currentState.animation];
    return this.currentState.frame >= totalFrames - 1;
  }

  /**
   * Get current animation info
   */
  getCurrentAnimation(): {
    animation: LPCAnimation;
    direction: LPCDirection;
  } | null {
    if (!this.currentState) return null;

    return {
      animation: this.currentState.animation,
      direction: this.currentState.direction
    };
  }

  /**
   * Stop current animation
   */
  stop(): void {
    this.currentState = null;
  }

  /**
   * Check if currently playing a specific animation
   */
  isPlaying(animation?: LPCAnimation): boolean {
    if (!this.currentState) return false;
    return animation ? this.currentState.animation === animation : true;
  }

  /**
   * Set frame size (for different sprite resolutions)
   */
  setFrameSize(width: number, height: number): void {
    this.frameWidth = width;
    this.frameHeight = height;
  }
}
