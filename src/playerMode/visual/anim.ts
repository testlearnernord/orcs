/**
 * Simple animation helper for player sprites
 */

export interface AnimationFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimationSequence {
  name: string;
  frames: AnimationFrame[];
  frameTime: number; // ms per frame
  loop: boolean;
}

export class AnimationController {
  private currentAnimation: string | null = null;
  private currentFrame: number = 0;
  private lastFrameTime: number = 0;
  private animations: Map<string, AnimationSequence> = new Map();

  /**
   * Register an animation sequence
   */
  addAnimation(sequence: AnimationSequence): void {
    this.animations.set(sequence.name, sequence);
  }

  /**
   * Play an animation
   */
  play(animationName: string): void {
    if (this.currentAnimation === animationName) {
      return; // Already playing
    }

    const animation = this.animations.get(animationName);
    if (!animation) {
      console.warn(
        `[AnimationController] Animation not found: ${animationName}`
      );
      return;
    }

    this.currentAnimation = animationName;
    this.currentFrame = 0;
    this.lastFrameTime = Date.now();
  }

  /**
   * Update animation (call each frame)
   */
  update(): void {
    if (!this.currentAnimation) {
      return;
    }

    const animation = this.animations.get(this.currentAnimation);
    if (!animation) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= animation.frameTime) {
      this.currentFrame++;
      this.lastFrameTime = now;

      if (this.currentFrame >= animation.frames.length) {
        if (animation.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = animation.frames.length - 1;
        }
      }
    }
  }

  /**
   * Get current frame for rendering
   */
  getCurrentFrame(): AnimationFrame | null {
    if (!this.currentAnimation) {
      return null;
    }

    const animation = this.animations.get(this.currentAnimation);
    if (!animation || animation.frames.length === 0) {
      return null;
    }

    return animation.frames[this.currentFrame] || null;
  }

  /**
   * Check if animation is finished (for non-looping animations)
   */
  isFinished(): boolean {
    if (!this.currentAnimation) {
      return true;
    }

    const animation = this.animations.get(this.currentAnimation);
    if (!animation || animation.loop) {
      return false;
    }

    return this.currentFrame >= animation.frames.length - 1;
  }

  /**
   * Get current animation name
   */
  getCurrentAnimation(): string | null {
    return this.currentAnimation;
  }

  /**
   * Stop current animation
   */
  stop(): void {
    this.currentAnimation = null;
    this.currentFrame = 0;
  }
}
