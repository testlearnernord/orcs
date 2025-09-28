/**
 * Player sprite rendering and animation system
 * Now using Universal LPC Spritesheet system for all archetypes
 */

import type { OrcArchetype } from '../../simulation/archetypes';
import {
  LPCRenderer,
  type LPCRenderState,
  type LPCDirection,
  type LPCAnimation
} from './lpc';
import { dirFromAngle } from '../systems/orbitMovement';

export interface PlayerSpriteState {
  archetype: OrcArchetype;
  position: { x: number; y: number };
  rotation: number;
  isDashing: boolean;
  isBlocking: boolean;
  isMoving: boolean;
  isExecutingSignature: boolean;
  isHurt?: boolean;
  direction?: LPCDirection;
  walkPhase?: number; // 0-1 for walk cycle
  speed?: number; // for distance-coupled animation
}

export interface PlayerSpriteConfig {
  archetype: OrcArchetype;
  tint?: string; // Color tint for player variation
  frameSize?: number; // LPC frame size (64, 128, 256, etc.)
}

/**
 * Manages player sprite rendering with LPC-based archetype visuals
 */
export class PlayerSpriteRenderer {
  private lpcRenderer: LPCRenderer;
  private config: PlayerSpriteConfig;
  private lastState: Partial<PlayerSpriteState> = {};
  private isLoaded: boolean = false;

  constructor(config: PlayerSpriteConfig) {
    this.config = config;
    this.lpcRenderer = new LPCRenderer({
      archetype: config.archetype,
      frameSize: config.frameSize || 64
    });

    // Start loading sprites asynchronously
    this.loadSprites();
  }

  /**
   * Load LPC sprites for the configured archetype
   */
  private async loadSprites(): Promise<void> {
    try {
      await this.lpcRenderer.loadSprites();
      this.isLoaded = true;
      console.log(
        `[PlayerSpriteRenderer] Successfully loaded ${this.config.archetype} sprites`
      );
    } catch (error) {
      console.error(
        `[PlayerSpriteRenderer] Failed to load ${this.config.archetype} sprites:`,
        error
      );
      // Fallback to a default state or placeholder
      this.isLoaded = false;
    }
  }

  /**
   * Update animation state based on player state
   */
  update(state: PlayerSpriteState): void {
    if (!this.isLoaded) {
      // Still loading, skip update
      return;
    }

    // Convert player state to LPC render state
    const lpcState: LPCRenderState = {
      position: state.position,
      direction: this.determineDirection(state),
      animation: this.determineAnimation(state),
      isMoving: state.isMoving,
      isAttacking: state.isExecutingSignature,
      isHurt: state.isHurt || false,
      speed: state.speed || 1.0
    };

    this.lpcRenderer.update(lpcState);
    this.lastState = { ...state };
  }

  /**
   * Render the player sprite to a canvas context
   */
  render(ctx: CanvasRenderingContext2D, state: PlayerSpriteState): void;
  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale?: number
  ): void;
  render(
    ctx: CanvasRenderingContext2D,
    stateOrX: PlayerSpriteState | number,
    y?: number,
    scale: number = 1
  ): void {
    // Handle legacy render(ctx, state) signature
    if (typeof stateOrX === 'object') {
      const state = stateOrX;
      const x = state.position.x * 50; // Convert to screen coordinates
      const y = state.position.y * 50;
      this.render(ctx, x, y, scale);
      return;
    }

    // Handle new render(ctx, x, y, scale) signature
    const x = stateOrX;
    if (y === undefined) {
      throw new Error('y coordinate is required');
    }

    if (!this.isLoaded) {
      // Render a simple placeholder while loading
      this.renderPlaceholder(ctx, x, y, scale);
      return;
    }

    this.lpcRenderer.render(ctx, x, y, scale);
  }

  /**
   * Render a simple placeholder while sprites are loading
   */
  private renderPlaceholder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number
  ): void {
    const size = 32 * scale;
    const colors = {
      Archer: '#4a9a4a',
      Berserker: '#c44444',
      Trapper: '#9944aa'
    };

    ctx.save();
    ctx.fillStyle = colors[this.config.archetype] || '#888888';
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${8 * scale}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(this.config.archetype.charAt(0), x, y + 3 * scale);
    ctx.restore();
  }

  /**
   * Determine sprite direction based on player state
   */
  private determineDirection(state: PlayerSpriteState): LPCDirection {
    // Use provided direction if available
    if (state.direction) {
      return state.direction;
    }

    // Fall back to rotation-based direction
    return dirFromAngle(state.rotation);
  }

  /**
   * Determine appropriate LPC animation based on player state
   */
  private determineAnimation(state: PlayerSpriteState): LPCAnimation {
    if (state.isHurt) {
      return 'hurt';
    }

    if (state.isExecutingSignature) {
      // Map signature moves to appropriate animations per archetype
      switch (state.archetype) {
        case 'Archer':
          return 'shoot'; // Volley -> shoot animation
        case 'Berserker':
          return 'slash'; // Rage Cleave -> slash animation
        case 'Trapper':
          return 'thrust'; // Snap Trap -> thrust animation
        default:
          return 'slash';
      }
    }

    if (state.isDashing) {
      return 'run'; // Dash uses run animation
    }

    if (state.isMoving) {
      const speed = state.speed || 1.0;
      return speed > 1.5 ? 'run' : 'walk';
    }

    return 'idle';
  }

  /**
   * Check if the sprite system is ready for rendering
   */
  isReady(): boolean {
    return this.isLoaded && this.lpcRenderer.isReady();
  }

  /**
   * Get current frame information (useful for hit detection, effects, etc.)
   */
  getCurrentFrame() {
    return this.lpcRenderer.getCurrentFrame();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.lpcRenderer.dispose();
  }

  /**
   * Legacy compatibility methods
   */

  /**
   * Check if currently playing signature animation
   */
  isPlayingSignature(): boolean {
    const currentAnimation = this.lpcRenderer.getCurrentAnimation();
    // For non-looping signature animations, check if still playing
    return (
      currentAnimation?.animation === 'slash' ||
      currentAnimation?.animation === 'shoot' ||
      currentAnimation?.animation === 'thrust'
    );
  }

  /**
   * Get current archetype
   */
  getArchetype(): OrcArchetype {
    return this.config.archetype;
  }

  /**
   * Set tint color (placeholder for future implementation)
   */
  setTint(tint: string): void {
    this.config.tint = tint;
  }
}
