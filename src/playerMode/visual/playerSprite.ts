/**
 * Player sprite rendering and animation system
 */

import type { OrcArchetype } from '../../simulation/archetypes';
import { AnimationController } from './anim';
import { BERS, idxWalk, idxRun, idxSlash, idxHurt } from './atlas.berserker';
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
  direction?: 'L' | 'R' | 'U' | 'D';
  walkPhase?: number; // 0-1 for walk cycle
  speed?: number; // for distance-coupled animation
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

  // Berserker sprite atlases (loaded images)
  private berserkerImages: {
    walk?: HTMLImageElement;
    run?: HTMLImageElement;
    slash?: HTMLImageElement;
    hurt?: HTMLImageElement;
  } = {};

  // Walk animation state for distance-coupled animation
  private walkPhase = 0;
  private lastUpdateTime = 0;

  // Color palettes for different archetypes
  private readonly archetypePalettes = {
    Archer: {
      primary: '#4a9a4a', // Green
      secondary: '#2d5a2d', // Dark green
      accent: '#6bb36b' // Light green
    },
    Berserker: {
      primary: '#c44444', // Red
      secondary: '#7a2a2a', // Dark red
      accent: '#e66666' // Light red
    },
    Trapper: {
      primary: '#9944aa', // Purple
      secondary: '#5a2a6a', // Dark purple
      accent: '#bb66cc' // Light purple
    }
  };

  constructor(config: PlayerSpriteConfig) {
    this.config = config;
    this.animController = new AnimationController();
    this.setupAnimations();

    // Load berserker sprites if archetype is Berserker
    if (config.archetype === 'Berserker') {
      this.loadBerserkerSprites();
    }
  }

  /**
   * Load berserker sprite atlases
   */
  private loadBerserkerSprites(): void {
    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
      });
    };

    // Load all berserker atlases
    Promise.all([
      loadImage(BERS.walk.url),
      loadImage(BERS.run.url),
      loadImage(BERS.slash.url),
      loadImage(BERS.hurt.url)
    ])
      .then(([walk, run, slash, hurt]) => {
        this.berserkerImages = { walk, run, slash, hurt };
      })
      .catch((error) => {
        console.warn(
          '[PlayerSpriteRenderer] Failed to load berserker sprites:',
          error
        );
      });
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
        {
          x: frameWidth,
          y: frameHeight,
          width: frameWidth,
          height: frameHeight
        },
        {
          x: frameWidth * 2,
          y: frameHeight,
          width: frameWidth,
          height: frameHeight
        },
        {
          x: frameWidth * 3,
          y: frameHeight,
          width: frameWidth,
          height: frameHeight
        }
      ],
      frameTime: 150,
      loop: true
    });

    // Dash animation (single frame with afterimage effect)
    this.animController.addAnimation({
      name: 'dash',
      frames: [
        { x: 0, y: frameHeight * 2, width: frameWidth, height: frameHeight }
      ],
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
    // Handle berserker-specific animation updates
    if (this.config.archetype === 'Berserker') {
      this.updateBerserkerAnimation(state);
      return;
    }

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
   * Update berserker animation with distance-coupled walk cycle
   */
  private updateBerserkerAnimation(state: PlayerSpriteState): void {
    const now = Date.now();
    if (this.lastUpdateTime === 0) {
      this.lastUpdateTime = now;
    }
    const deltaTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    // Update walk phase based on speed for distance-coupled animation
    if (state.isMoving && state.speed && deltaTime > 0) {
      this.walkPhase =
        (this.walkPhase + (state.speed * deltaTime) / (40 * 8)) % 1;
    }

    // Store the current state for berserker rendering
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

    // Handle berserker-specific rendering
    if (this.config.archetype === 'Berserker') {
      this.renderBerserkerSprite(ctx, state);
      ctx.restore();
      return;
    }

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
   * Render berserker sprite using atlas system
   */
  private renderBerserkerSprite(
    ctx: CanvasRenderingContext2D,
    state: PlayerSpriteState
  ): void {
    // Enable pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    // Determine direction from rotation if not provided
    const direction = state.direction || dirFromAngle(state.rotation);

    let atlas: HTMLImageElement | undefined;
    let frameIndex = 0;

    // Determine which atlas and frame to use
    if (state.isHurt && this.berserkerImages.hurt) {
      atlas = this.berserkerImages.hurt;
      frameIndex = idxHurt(
        direction,
        Math.floor(Math.random() * 6) as 0 | 1 | 2 | 3 | 4 | 5
      ); // Random hurt frame
    } else if (state.isExecutingSignature && this.berserkerImages.slash) {
      atlas = this.berserkerImages.slash;
      // Use time-based animation, could be enhanced with proper frame tracking
      const frame = Math.floor((Date.now() / 100) % 6);
      frameIndex = idxSlash(direction, frame as 0 | 1 | 2 | 3 | 4 | 5);
    } else if (state.isDashing && this.berserkerImages.run) {
      atlas = this.berserkerImages.run;
      // Fast run animation for dash
      const frame = Math.floor((Date.now() / 50) % 8);
      frameIndex = idxRun(direction, frame as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7);

      // Add afterimage trail
      ctx.globalAlpha = 0.3;
      for (let i = 1; i <= 3; i++) {
        ctx.save();
        ctx.translate(-i * 8, 0);
        this.drawBerserkerFrame(ctx, atlas, frameIndex);
        ctx.restore();
      }
      ctx.globalAlpha = 1.0;
    } else if (state.isMoving && this.berserkerImages.walk) {
      atlas = this.berserkerImages.walk;
      // Distance-coupled walk animation
      const frame = Math.floor(this.walkPhase * 8) + 1; // 1-8 for walk frames
      frameIndex = idxWalk(direction, frame as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8);
    } else if (this.berserkerImages.walk) {
      // Idle - use walk atlas column 0
      atlas = this.berserkerImages.walk;
      frameIndex = idxWalk(direction, 'idle');
    }

    // Draw the sprite frame
    if (atlas) {
      this.drawBerserkerFrame(ctx, atlas, frameIndex);
    } else {
      // Fallback to placeholder if sprites not loaded
      this.drawPlayerShape(
        ctx,
        this.archetypePalettes.Berserker,
        state.isBlocking || false
      );
    }
  }

  /**
   * Draw a specific frame from berserker atlas
   */
  private drawBerserkerFrame(
    ctx: CanvasRenderingContext2D,
    atlas: HTMLImageElement,
    frameIndex: number
  ): void {
    // Determine atlas type and cols based on which atlas is being used
    let cols = 9; // Default for walk atlas
    if (atlas === this.berserkerImages.run) {
      cols = 8;
    } else if (
      atlas === this.berserkerImages.slash ||
      atlas === this.berserkerImages.hurt
    ) {
      cols = 6;
    }

    const frameWidth = atlas.width / cols;
    const frameHeight = atlas.height / 4; // 4 rows for directions

    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);

    const srcX = col * frameWidth;
    const srcY = row * frameHeight;

    // Draw centered at current position
    const drawWidth = 64; // Scale up from 256px sprites
    const drawHeight = 64;

    ctx.drawImage(
      atlas,
      srcX,
      srcY,
      frameWidth,
      frameHeight,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
  }

  /**
   * Draw the basic player shape (placeholder for sprite atlas)
   */
  private drawPlayerShape(
    ctx: CanvasRenderingContext2D,
    palette: any,
    isBlocking: boolean
  ): void {
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
  private drawArchetypeIndicator(
    ctx: CanvasRenderingContext2D,
    palette: any
  ): void {
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
    return (
      this.animController.getCurrentAnimation() === 'signature' &&
      !this.animController.isFinished()
    );
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
