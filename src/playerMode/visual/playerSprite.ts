/**
 * Player sprite rendering and animation system
 */

import type { OrcArchetype } from '../../simulation/archetypes';
import { AnimationController } from './anim';

export interface PlayerSpriteState {
  archetype: OrcArchetype;
  position: { x: number; y: number };
  rotation: number;
  isDashing: boolean;
  isBlocking: boolean;
  isMoving: boolean;
  isExecutingSignature: boolean;
}

export interface PlayerSpriteConfig {
  archetype: OrcArchetype;
  tint?: string; // Color tint for player variation
}

/**
 * Manages player sprite rendering with archetype-based visuals
 */
export class PlayerSpriteRenderer {
  private animController: AnimationController;
  private config: PlayerSpriteConfig;
  private lastState: Partial<PlayerSpriteState> = {};

  // Color palettes for different archetypes
  private readonly archetypePalettes = {
    Archer: {
      primary: '#4a9a4a',   // Green
      secondary: '#2d5a2d', // Dark green
      accent: '#6bb36b'     // Light green
    },
    Berserker: {
      primary: '#c44444',   // Red
      secondary: '#7a2a2a', // Dark red
      accent: '#e66666'     // Light red
    },
    Trapper: {
      primary: '#9944aa',   // Purple
      secondary: '#5a2a6a', // Dark purple
      accent: '#bb66cc'     // Light purple
    }
  };

  constructor(config: PlayerSpriteConfig) {
    this.config = config;
    this.animController = new AnimationController();
    this.setupAnimations();
  }

  /**
   * Setup placeholder animations for the archetype
   */
  private setupAnimations(): void {
    // Placeholder frame dimensions
    const frameWidth = 32;
    const frameHeight = 32;

    // Idle animation (single frame, looping)
    this.animController.addAnimation({
      name: 'idle',
      frames: [{ x: 0, y: 0, width: frameWidth, height: frameHeight }],
      frameTime: 1000,
      loop: true
    });

    // Move animation (4 frames)
    this.animController.addAnimation({
      name: 'move',
      frames: [
        { x: 0, y: frameHeight, width: frameWidth, height: frameHeight },
        { x: frameWidth, y: frameHeight, width: frameWidth, height: frameHeight },
        { x: frameWidth * 2, y: frameHeight, width: frameWidth, height: frameHeight },
        { x: frameWidth * 3, y: frameHeight, width: frameWidth, height: frameHeight }
      ],
      frameTime: 150,
      loop: true
    });

    // Dash animation (single frame with afterimage effect)
    this.animController.addAnimation({
      name: 'dash',
      frames: [{ x: 0, y: frameHeight * 2, width: frameWidth, height: frameHeight }],
      frameTime: 200,
      loop: false
    });

    // Signature animation (varies by archetype)
    const signatureFrames = this.getSignatureFrames();
    this.animController.addAnimation({
      name: 'signature',
      frames: signatureFrames,
      frameTime: 100,
      loop: false
    });
  }

  /**
   * Get signature animation frames based on archetype
   */
  private getSignatureFrames() {
    const frameWidth = 32;
    const frameHeight = 32;
    const baseY = frameHeight * 3;

    switch (this.config.archetype) {
      case 'Archer':
        // Volley - 6 frames
        return Array.from({ length: 6 }, (_, i) => ({
          x: i * frameWidth,
          y: baseY,
          width: frameWidth,
          height: frameHeight
        }));
      
      case 'Berserker':
        // Rage Cleave - 8 frames
        return Array.from({ length: 8 }, (_, i) => ({
          x: i * frameWidth,
          y: baseY,
          width: frameWidth,
          height: frameHeight
        }));
      
      case 'Trapper':
        // Net Trap - 7 frames
        return Array.from({ length: 7 }, (_, i) => ({
          x: i * frameWidth,
          y: baseY,
          width: frameWidth,
          height: frameHeight
        }));
      
      default:
        return [{ x: 0, y: baseY, width: frameWidth, height: frameHeight }];
    }
  }

  /**
   * Update animation state based on player state
   */
  update(state: PlayerSpriteState): void {
    // Determine which animation should be playing
    let targetAnimation = 'idle';

    if (state.isExecutingSignature) {
      targetAnimation = 'signature';
    } else if (state.isDashing) {
      targetAnimation = 'dash';
    } else if (state.isMoving) {
      targetAnimation = 'move';
    }

    // Play animation if it changed
    if (targetAnimation !== this.animController.getCurrentAnimation()) {
      this.animController.play(targetAnimation);
    }

    // Update animation controller
    this.animController.update();
    
    this.lastState = { ...state };
  }

  /**
   * Render the player sprite to canvas
   */
  render(ctx: CanvasRenderingContext2D, state: PlayerSpriteState): void {
    const { position, rotation, isBlocking, isDashing } = state;
    const palette = this.archetypePalettes[this.config.archetype];

    ctx.save();
    
    // Transform to player position and rotation
    ctx.translate(position.x * 50, position.y * 50);
    ctx.rotate(rotation);

    // Add dash afterimage effect
    if (isDashing) {
      ctx.globalAlpha = 0.3;
      for (let i = 1; i <= 3; i++) {
        ctx.save();
        ctx.translate(-i * 8, 0);
        this.drawPlayerShape(ctx, palette, false);
        ctx.restore();
      }
      ctx.globalAlpha = 1.0;
    }

    // Draw main player sprite
    this.drawPlayerShape(ctx, palette, isBlocking);

    // Draw direction indicator
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, -2, 6, 4);

    ctx.restore();
  }

  /**
   * Draw the basic player shape (placeholder for sprite atlas)
   */
  private drawPlayerShape(ctx: CanvasRenderingContext2D, palette: any, isBlocking: boolean): void {
    // Main body
    ctx.fillStyle = palette.primary;
    ctx.fillRect(-12, -12, 24, 24);

    // Secondary details
    ctx.fillStyle = palette.secondary;
    ctx.fillRect(-8, -8, 16, 16);

    // Accent/highlight
    ctx.fillStyle = palette.accent;
    ctx.fillRect(-4, -4, 8, 8);

    // Blocking indicator
    if (isBlocking) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(-14, -14, 28, 28);
    }

    // Archetype indicator
    this.drawArchetypeIndicator(ctx, palette);
  }

  /**
   * Draw small indicator for archetype
   */
  private drawArchetypeIndicator(ctx: CanvasRenderingContext2D, palette: any): void {
    ctx.fillStyle = palette.accent;
    
    switch (this.config.archetype) {
      case 'Archer':
        // Arrow symbol
        ctx.beginPath();
        ctx.moveTo(8, -6);
        ctx.lineTo(12, -4);
        ctx.lineTo(8, -2);
        ctx.lineTo(10, -4);
        ctx.closePath();
        ctx.fill();
        break;
      
      case 'Berserker':
        // Axe symbol
        ctx.fillRect(8, -6, 2, 8);
        ctx.fillRect(6, -8, 6, 2);
        break;
      
      case 'Trapper':
        // Net symbol
        for (let x = 0; x < 3; x++) {
          for (let y = 0; y < 3; y++) {
            ctx.fillRect(6 + x * 2, -6 + y * 2, 1, 1);
          }
        }
        break;
    }
  }

  /**
   * Check if currently playing signature animation
   */
  isPlayingSignature(): boolean {
    return this.animController.getCurrentAnimation() === 'signature' && 
           !this.animController.isFinished();
  }

  /**
   * Get current archetype
   */
  getArchetype(): OrcArchetype {
    return this.config.archetype;
  }

  /**
   * Set tint color
   */
  setTint(tint: string): void {
    this.config.tint = tint;
  }
}