/**
 * LPC Character Loader
 * Loads and manages LPC character configurations and sprites
 */

import type {
  LPCCharacterConfig,
  LPCMetadata,
  LPCCharacterSprites,
  LPCAnimation,
  LPCAnimationAtlas
} from './types';

/**
 * Loads LPC character data from JSON configuration files
 */
export class LPCCharacterLoader {
  /**
   * Load character configuration from character.json file
   */
  static async loadCharacterConfig(
    configPath: string
  ): Promise<LPCCharacterConfig> {
    try {
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(
          `Failed to load character config: ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      throw new Error(
        `Error loading character config from ${configPath}: ${error}`
      );
    }
  }

  /**
   * Load metadata from metadata.json file
   */
  static async loadMetadata(metadataPath: string): Promise<LPCMetadata> {
    try {
      const response = await fetch(metadataPath);
      if (!response.ok) {
        throw new Error(`Failed to load metadata: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Error loading metadata from ${metadataPath}: ${error}`);
    }
  }

  /**
   * Load sprite image for a specific animation
   */
  static async loadSpriteImage(imagePath: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error(`Failed to load sprite image: ${imagePath}`));
      img.src = imagePath;
    });
  }

  /**
   * Try loading an image from multiple potential paths with smarter fallback logic
   */
  static async loadSpriteImageWithFallbacks(
    basePath: string,
    animation: LPCAnimation,
    frameSize: number
  ): Promise<HTMLImageElement> {
    // For berserker archetype, prioritize standard/ directory which we know exists
    // Order paths by likelihood of success to minimize 404s
    const potentialPaths = basePath.includes('berserker')
      ? [
          `${basePath}/standard/${animation}.png`, // Standard subdirectory: standard/walk.png (berserker - high priority)
          `${basePath}/${animation}.png` // Simple naming: walk.png (fallback)
        ]
      : [
          `${basePath}/${animation}.png`, // Simple naming: walk.png (other archetypes)
          `${basePath}/standard/${animation}.png`, // Standard subdirectory fallback
          `${basePath}/${animation}_${frameSize}.png` // Direct naming with size
        ];

    // Try each path until one succeeds
    for (const imagePath of potentialPaths) {
      try {
        const image = await this.loadSpriteImage(imagePath);
        console.log(
          `[LPCLoader] Successfully loaded ${animation} from: ${imagePath}`
        );
        return image;
      } catch (error) {
        // Only log debug message to reduce console noise
        console.debug(
          `[LPCLoader] Failed to load ${animation} from: ${imagePath}`
        );
      }
    }

    // If all paths fail, throw an error
    throw new Error(
      `Failed to load sprite image for ${animation}. Tried paths: ${potentialPaths.join(', ')}`
    );
  }

  /**
   * Create atlas configuration for an animation based on metadata
   */
  static createAnimationAtlas(
    animation: LPCAnimation,
    basePath: string,
    frameSize: number,
    frameCounts: Record<string, number>
  ): LPCAnimationAtlas {
    const frameCount = frameCounts[animation] || 1;

    // Use the first potential path as the base URL (will be overridden during loading)
    const url = `${basePath}/${animation}_${frameSize}.png`;

    return {
      url,
      frameWidth: frameSize,
      frameHeight: frameSize,
      cols: frameCount,
      rows: 4, // Standard LPC: 4 directions
      frameCount
    };
  }

  /**
   * Load complete character sprite set with all animations
   */
  static async loadCharacterSprites(
    characterId: string,
    basePath: string,
    animations: LPCAnimation[] = ['walk', 'run', 'idle', 'slash', 'hurt']
  ): Promise<LPCCharacterSprites> {
    try {
      // Load configuration files
      const [config, metadata] = await Promise.all([
        this.loadCharacterConfig(`${basePath}/character.json`),
        this.loadMetadata(`${basePath}/credits/metadata.json`)
      ]);

      // Create atlas configurations
      const atlases = new Map<LPCAnimation, LPCAnimationAtlas>();
      const images = new Map<LPCAnimation, HTMLImageElement>();

      console.log(`[LPCLoader] Loading composited sprites for ${characterId} (${config.layers.length} layers in character.json)`);

      // Load each animation's sprite sheet using composited files
      const loadPromises = animations.map(async (animation) => {
        const atlas = this.createAnimationAtlas(
          animation,
          basePath,
          metadata.frameSize,
          metadata.frameCounts
        );

        try {
          const image = await this.loadSpriteImageWithFallbacks(
            basePath,
            animation,
            metadata.frameSize
          );
          atlases.set(animation, atlas);
          images.set(animation, image);
          console.log(`[LPCLoader] Successfully loaded ${animation} sprite`);
        } catch (error) {
          console.warn(
            `Failed to load ${animation} sprite for ${characterId}:`,
            error
          );
          // Continue loading other animations even if one fails
        }
      });

      await Promise.all(loadPromises);

      return {
        characterId,
        config,
        metadata,
        atlases,
        images
      };
    } catch (error) {
      throw new Error(
        `Failed to load character sprites for ${characterId}: ${error}`
      );
    }
  }

  /**
   * Get supported animations for a character based on metadata
   */
  static getSupportedAnimations(metadata: LPCMetadata): LPCAnimation[] {
    const supported: LPCAnimation[] = [];

    // Add standard animations that were successfully exported
    const standardAnimations = metadata.standardAnimations.exported;
    for (const anim of standardAnimations) {
      if (this.isValidLPCAnimation(anim)) {
        supported.push(anim as LPCAnimation);
      }
    }

    return supported;
  }

  /**
   * Validate if a string is a valid LPC animation name
   */
  private static isValidLPCAnimation(name: string): name is LPCAnimation {
    const validAnimations: LPCAnimation[] = [
      'walk',
      'run',
      'idle',
      'slash',
      'hurt',
      'spellcast',
      'thrust',
      'shoot',
      'climb',
      'jump',
      'sit',
      'emote',
      'combat_idle',
      'backslash',
      'halfslash'
    ];
    return validAnimations.includes(name as LPCAnimation);
  }
}
