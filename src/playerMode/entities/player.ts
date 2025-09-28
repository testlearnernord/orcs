/**
 * Player entity system - combines controller, sprite, and state
 */

import type { Point2D } from '../../combat/hitbox';
import type { OrcArchetype } from '../../simulation/archetypes';
import type { PlayerAction, PlayerState } from '../systems/playerController';
import {
  PlayerSpriteRenderer,
  type PlayerSpriteState
} from '../visual/playerSprite';

export interface PlayerEntityConfig {
  archetype: OrcArchetype;
  startPosition: Point2D;
  playerId?: string; // For multiplayer seed-based tinting
}

export interface PlayerEntityState extends PlayerState {
  archetype: OrcArchetype;
  isExecutingSignature: boolean;
  signatureEndTime: number;
}

/**
 * Complete player entity that manages state, visuals, and actions
 */
export class PlayerEntity {
  private state: PlayerEntityState;
  private spriteRenderer: PlayerSpriteRenderer;
  private config: PlayerEntityConfig;

  constructor(config: PlayerEntityConfig) {
    this.config = config;

    this.state = {
      position: { ...config.startPosition },
      rotation: 0,
      stamina: 100, // Will be synced with controller
      isDashing: false,
      isBlocking: false,
      isInvulnerable: false,
      dashEndTime: 0,
      iframeEndTime: 0,
      lastStaminaUse: 0,
      blockDirection: 0,
      // New properties
      motion: 'idle',
      direction: 'D',
      isLockedOn: false,
      speed: 0,
      walkPhase: 0,
      // Entity-specific properties
      archetype: config.archetype,
      isExecutingSignature: false,
      signatureEndTime: 0
    };

    // Create sprite renderer with archetype-based appearance
    this.spriteRenderer = new PlayerSpriteRenderer({
      archetype: config.archetype,
      tint: this.generatePlayerTint(config.playerId || 'default')
    });
  }

  /**
   * Generate a consistent tint color based on player ID
   */
  private generatePlayerTint(playerId: string): string {
    // Simple hash function for consistent colors
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
      const char = playerId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Generate subtle color variations
    const hue = Math.abs(hash) % 360;
    const saturation = 30 + (Math.abs(hash >> 8) % 40); // 30-70%
    const lightness = 45 + (Math.abs(hash >> 16) % 20); // 45-65%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Update player entity from controller state and actions
   */
  update(controllerState: PlayerState, actions: PlayerAction[]): void {
    // Sync basic state from controller
    this.state.position = { ...controllerState.position };
    this.state.rotation = controllerState.rotation;
    this.state.stamina = controllerState.stamina;
    this.state.isDashing = controllerState.isDashing;
    this.state.isBlocking = controllerState.isBlocking;
    this.state.isInvulnerable = controllerState.isInvulnerable;
    this.state.dashEndTime = controllerState.dashEndTime;
    this.state.iframeEndTime = controllerState.iframeEndTime;
    this.state.lastStaminaUse = controllerState.lastStaminaUse;
    this.state.blockDirection = controllerState.blockDirection;

    // Process actions for visual effects
    const now = Date.now();
    actions.forEach((action) => {
      if (action.type === 'signature') {
        this.state.isExecutingSignature = true;
        this.state.signatureEndTime = now + this.getSignatureDuration();
      }
    });

    // Update signature state
    if (this.state.isExecutingSignature && now > this.state.signatureEndTime) {
      this.state.isExecutingSignature = false;
    }

    // Update sprite animation
    const spriteState: PlayerSpriteState = {
      archetype: this.state.archetype,
      position: this.state.position,
      rotation: this.state.rotation,
      isDashing: this.state.isDashing,
      isBlocking: this.state.isBlocking,
      isMoving: this.isMoving(controllerState),
      isExecutingSignature: this.state.isExecutingSignature
    };

    this.spriteRenderer.update(spriteState);
  }

  /**
   * Check if player is moving based on position changes
   */
  private isMoving(_controllerState: PlayerState): boolean {
    // Simple movement detection - in a real implementation,
    // this would track velocity or position changes
    return false; // Placeholder - will be set by external movement detection
  }

  /**
   * Get signature animation duration based on archetype
   */
  private getSignatureDuration(): number {
    switch (this.state.archetype) {
      case 'Archer':
        return 600; // Volley
      case 'Berserker':
        return 800; // Rage Cleave
      case 'Trapper':
        return 700; // Net Trap
      default:
        return 500;
    }
  }

  /**
   * Render the player entity
   */
  render(ctx: CanvasRenderingContext2D): void {
    const spriteState: PlayerSpriteState = {
      archetype: this.state.archetype,
      position: this.state.position,
      rotation: this.state.rotation,
      isDashing: this.state.isDashing,
      isBlocking: this.state.isBlocking,
      isMoving: false, // Will be determined by movement system
      isExecutingSignature: this.state.isExecutingSignature
    };

    this.spriteRenderer.render(ctx, spriteState);
  }

  /**
   * Get current player state
   */
  getState(): Readonly<PlayerEntityState> {
    return { ...this.state };
  }

  /**
   * Get player position for camera following
   */
  getPosition(): Point2D {
    return { ...this.state.position };
  }

  /**
   * Get player archetype
   */
  getArchetype(): OrcArchetype {
    return this.state.archetype;
  }

  /**
   * Check if player is currently executing signature move
   */
  isExecutingSignature(): boolean {
    return this.state.isExecutingSignature;
  }

  /**
   * Reset player to initial state
   */
  reset(position?: Point2D): void {
    if (position) {
      this.state.position = { ...position };
    } else {
      this.state.position = { ...this.config.startPosition };
    }

    this.state.rotation = 0;
    this.state.isDashing = false;
    this.state.isBlocking = false;
    this.state.isInvulnerable = false;
    this.state.isExecutingSignature = false;
    this.state.signatureEndTime = 0;
    this.state.dashEndTime = 0;
    this.state.iframeEndTime = 0;
    this.state.lastStaminaUse = 0;
    this.state.blockDirection = 0;
  }
}
