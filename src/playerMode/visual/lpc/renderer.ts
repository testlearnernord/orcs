/**
 * Universal LPC Sprite Renderer
 * Renders LPC characters with layered sprites and proper animations
 */

import { LPCAnimator, type LPCAnimationFrame } from './animator';
import { LPCCharacterLoader } from './loader';
import type {
  LPCCharacterSprites,
  LPCAnimation,
  LPCDirection,
  LPCLayer
} from './types';
import type { OrcArchetype } from '../../../simulation/archetypes';

export interface LPCRenderState {
  position: { x: number; y: number };
  direction: LPCDirection;
  animation: LPCAnimation;
  isMoving: boolean;
  isAttacking: boolean;
  isHurt: boolean;
  speed: number;
}

export interface LPCRendererConfig {
  archetype: OrcArchetype;
  frameSize?: number;
}

/**
 * Universal LPC sprite renderer that handles all archetypes
 * using the standard LPC sprite format and layering system
 */
export class LPCRenderer {
  private animator: LPCAnimator;
  private sprites: LPCCharacterSprites | null = null;
  private config: LPCRendererConfig;
  private lastState: Partial<LPCRenderState> = {};

  constructor(config: LPCRendererConfig) {
    this.config = config;
    this.animator = new LPCAnimator(
      config.frameSize || 64,
      config.frameSize || 64
    );
  }

  /**
   * Load sprites for the configured archetype
   */
  async loadSprites(): Promise<void> {
    const basePath = this.getArchetypeSpritePath(this.config.archetype);

    try {
      this.sprites = await LPCCharacterLoader.loadCharacterSprites(
        this.config.archetype.toLowerCase(),
        basePath,
        ['walk', 'run', 'idle', 'slash', 'hurt'] // Core animations for player mode
      );

      // Set frame size based on loaded metadata
      const frameSize = this.sprites.metadata.frameSize;
      this.animator.setFrameSize(frameSize, frameSize);

      console.log(`[LPCRenderer] Loaded sprites for ${this.config.archetype}`, {
        animations: Array.from(this.sprites.atlases.keys()),
        frameSize: frameSize
      });
    } catch (error) {
      console.error(
        `Failed to load LPC sprites for ${this.config.archetype}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Update animation state based on player state
   */
  update(state: LPCRenderState): void {
    if (!this.sprites) {
      console.warn('[LPCRenderer] No sprites loaded, call loadSprites() first');
      return;
    }

    // Determine target animation based on state
    const targetAnimation = this.determineAnimation(state);

    // Check if we need to change animation or direction
    const currentAnim = this.animator.getCurrentAnimation();
    const animationChanged =
      !currentAnim ||
      currentAnim.animation !== targetAnimation ||
      currentAnim.direction !== state.direction;

    if (animationChanged) {
      const shouldLoop = this.shouldLoopAnimation(targetAnimation);
      this.animator.play(targetAnimation, state.direction, shouldLoop);
    }

    // Update animator
    this.animator.update();

    this.lastState = { ...state };
  }

  /**
   * Render the current frame to a canvas context
   */
  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number = 1
  ): void {
    if (!this.sprites) return;

    const frame = this.animator.getCurrentFrame();
    if (!frame) return;

    // Get sorted layers by z-position
    const sortedLayers = [...this.sprites.config.layers].sort(
      (a, b) => a.zPos - b.zPos
    );

    // Render each layer
    for (const layer of sortedLayers) {
      this.renderLayer(ctx, layer, frame, x, y, scale);
    }
  }

  /**
   * Render a single sprite layer
   */
  private renderLayer(
    ctx: CanvasRenderingContext2D,
    layer: LPCLayer,
    frame: LPCAnimationFrame,
    x: number,
    y: number,
    scale: number
  ): void {
    // For now, we'll use the animation that's currently playing
    // In a full implementation, each layer could have its own sprite sheet
    const currentAnim = this.animator.getCurrentAnimation();
    if (!currentAnim) return;

    const image = this.sprites?.images.get(currentAnim.animation);
    if (!image) return;

    // Check if layer supports current animation
    if (!this.layerSupportsAnimation(layer, currentAnim.animation)) {
      return;
    }

    ctx.save();

    try {
      ctx.drawImage(
        image,
        frame.x,
        frame.y,
        frame.width,
        frame.height,
        x - (frame.width * scale) / 2,
        y - (frame.height * scale) / 2,
        frame.width * scale,
        frame.height * scale
      );
    } catch (error) {
      console.warn(`Failed to render layer ${layer.name}:`, error);
    }

    ctx.restore();
  }

  /**
   * Check if a layer supports a specific animation
   */
  private layerSupportsAnimation(
    layer: LPCLayer,
    animation: LPCAnimation
  ): boolean {
    const supportedAnimations = layer.supportedAnimations
      .split(',')
      .map((s) => s.trim());
    return (
      supportedAnimations.includes(animation) ||
      supportedAnimations.includes('*')
    );
  }

  /**
   * Determine the appropriate animation based on player state
   */
  private determineAnimation(state: LPCRenderState): LPCAnimation {
    if (state.isHurt) {
      return 'hurt';
    }

    if (state.isAttacking) {
      return 'slash'; // Could be made archetype-specific later
    }

    if (state.isMoving) {
      // Use run for higher speeds, walk for normal movement
      return state.speed > 1.5 ? 'run' : 'walk';
    }

    return 'idle';
  }

  /**
   * Determine if an animation should loop
   */
  private shouldLoopAnimation(animation: LPCAnimation): boolean {
    const nonLoopingAnimations: LPCAnimation[] = [
      'slash',
      'hurt',
      'thrust',
      'shoot'
    ];
    return !nonLoopingAnimations.includes(animation);
  }

  /**
   * Get sprite path for an archetype
   */
  private getArchetypeSpritePath(archetype: OrcArchetype): string {
    return new URL(
      `../../../assets/battlesystem/${archetype.toLowerCase()}`,
      import.meta.url
    ).toString();
  }

  /**
   * Check if sprites are loaded and ready
   */
  isReady(): boolean {
    return this.sprites !== null && this.sprites.images.size > 0;
  }

  /**
   * Get the current animation frame for external use (e.g., hit boxes)
   */
  getCurrentFrame(): LPCAnimationFrame | null {
    return this.animator.getCurrentFrame();
  }

  /**
   * Get current animation information
   */
  getCurrentAnimation(): {
    animation: LPCAnimation;
    direction: LPCDirection;
  } | null {
    return this.animator.getCurrentAnimation();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.animator.stop();
    this.sprites = null;
  }
}
