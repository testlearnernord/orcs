/**
 * Example demonstrating how to use the Universal LPC Sprite System
 *
 * This example shows how to create and use LPC sprites for all archetypes
 * with proper animations and layer compositing.
 */

import {
  LPCRenderer,
  LPCAnimator,
  LPCCharacterLoader,
  type LPCRenderState,
  type LPCAnimation,
  type LPCDirection
} from '../src/playerMode/visual/lpc';
import type { OrcArchetype } from '../src/simulation/archetypes';

// Example: Creating an LPC renderer for an archetype
async function createArchetypeRenderer(
  archetype: OrcArchetype
): Promise<LPCRenderer> {
  const renderer = new LPCRenderer({
    archetype,
    frameSize: 64 // Standard LPC frame size
  });

  // Load sprites asynchronously
  await renderer.loadSprites();

  return renderer;
}

// Example: Using the LPC animator directly
function demonstrateAnimator() {
  const animator = new LPCAnimator(64, 64);

  // Start a walking animation facing down
  animator.play('walk', 'D', true);

  // Animation loop
  const animate = () => {
    animator.update();

    const frame = animator.getCurrentFrame();
    if (frame) {
      console.log(`Current frame: col=${frame.col}, row=${frame.row}`);
    }

    requestAnimationFrame(animate);
  };

  animate();
}

// Example: Rendering all archetypes with different animations
async function renderAllArchetypes(ctx: CanvasRenderingContext2D) {
  const archetypes: OrcArchetype[] = ['Archer', 'Berserker', 'Trapper'];
  const animations: LPCAnimation[] = ['walk', 'run', 'slash'];

  for (let i = 0; i < archetypes.length; i++) {
    const archetype = archetypes[i];
    const animation = animations[i % animations.length];

    const renderer = await createArchetypeRenderer(archetype);

    const renderState: LPCRenderState = {
      position: { x: i * 100, y: 100 },
      direction: 'D',
      animation,
      isMoving: animation === 'walk' || animation === 'run',
      isAttacking: animation === 'slash',
      isHurt: false,
      speed: animation === 'run' ? 2.0 : 1.0
    };

    renderer.update(renderState);
    renderer.render(ctx, i * 100 + 50, 150, 1.0);
  }
}

// Example: Loading character configuration manually
async function loadCharacterConfiguration() {
  try {
    const config = await LPCCharacterLoader.loadCharacterConfig(
      '/src/assets/battlesystem/berserker/character.json'
    );

    console.log('Character loaded:', {
      bodyType: config.bodyTypeName,
      layers: config.layers.length,
      credits: config.credits.length
    });

    // List all layers with their z-positions
    const sortedLayers = config.layers.sort((a, b) => a.zPos - b.zPos);
    sortedLayers.forEach((layer) => {
      console.log(`Layer: ${layer.name} (z=${layer.zPos})`);
    });
  } catch (error) {
    console.error('Failed to load character:', error);
  }
}

// Example usage in a game loop
class LPCCharacterController {
  private renderer: LPCRenderer;
  private currentAnimation: LPCAnimation = 'idle';
  private currentDirection: LPCDirection = 'D';

  constructor(private archetype: OrcArchetype) {
    this.renderer = new LPCRenderer({
      archetype,
      frameSize: 64
    });

    this.initialize();
  }

  private async initialize() {
    await this.renderer.loadSprites();
    console.log(`${this.archetype} sprites loaded and ready`);
  }

  update(input: {
    isMoving: boolean;
    isAttacking: boolean;
    isDashing: boolean;
    direction: LPCDirection;
    speed: number;
  }) {
    // Update animation based on input
    if (input.isAttacking) {
      this.currentAnimation = this.getAttackAnimation();
    } else if (input.isDashing) {
      this.currentAnimation = 'run';
    } else if (input.isMoving) {
      this.currentAnimation = input.speed > 1.5 ? 'run' : 'walk';
    } else {
      this.currentAnimation = 'idle';
    }

    this.currentDirection = input.direction;

    // Update renderer
    const renderState: LPCRenderState = {
      position: { x: 0, y: 0 }, // Will be set by renderer
      direction: this.currentDirection,
      animation: this.currentAnimation,
      isMoving: input.isMoving,
      isAttacking: input.isAttacking,
      isHurt: false,
      speed: input.speed
    };

    this.renderer.update(renderState);
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number = 1
  ) {
    this.renderer.render(ctx, x, y, scale);
  }

  private getAttackAnimation(): LPCAnimation {
    switch (this.archetype) {
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
}

export {
  createArchetypeRenderer,
  demonstrateAnimator,
  renderAllArchetypes,
  loadCharacterConfiguration,
  LPCCharacterController
};
