/**
 * LPC Layer Compositor
 * Composites multiple sprite layers into a single sprite sheet for each animation
 */

import type { LPCCharacterConfig, LPCAnimation } from './types';

export interface CompositeLayerInfo {
  fileName: string;
  zPos: number;
  name: string;
  supportedAnimations: string;
}

/**
 * Simple layer compositor for LPC characters
 * Creates composited sprites by layering individual sprite files
 */
export class LPCLayerCompositor {
  private config: LPCCharacterConfig;
  private basePath: string;

  constructor(config: LPCCharacterConfig, basePath: string) {
    this.config = config;
    this.basePath = basePath;
  }

  /**
   * Get layers that support a specific animation, sorted by z-position
   */
  private getLayersForAnimation(animation: LPCAnimation): CompositeLayerInfo[] {
    return this.config.layers
      .filter(layer => layer.supportedAnimations.includes(animation))
      .sort((a, b) => a.zPos - b.zPos); // Sort by z-position (bottom to top)
  }

  /**
   * Composite all relevant layers for an animation into a single sprite sheet
   */
  async compositeAnimation(animation: LPCAnimation, frameSize: number = 64): Promise<HTMLImageElement> {
    const layers = this.getLayersForAnimation(animation);
    
    if (layers.length === 0) {
      throw new Error(`No layers found supporting animation: ${animation}`);
    }

    console.log(`[LayerCompositor] Compositing ${layers.length} layers for ${animation}:`, 
      layers.map(l => `${l.name} (z:${l.zPos})`));

    // Calculate canvas dimensions based on standard LPC format
    const cols = this.getFrameCountForAnimation(animation);
    const rows = 4; // Standard LPC: 4 directions
    const canvasWidth = cols * frameSize;
    const canvasHeight = rows * frameSize;

    // Create canvas for compositing
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    // Load and composite each layer
    for (const layer of layers) {
      try {
        // Try to load individual layer sprite file
        const layerImage = await this.loadLayerSprite(layer, animation, frameSize);
        
        // Draw layer onto canvas
        ctx.drawImage(layerImage, 0, 0);
        console.log(`[LayerCompositor] Added layer: ${layer.name}`);
      } catch (error) {
        console.warn(`[LayerCompositor] Failed to load layer ${layer.name}:`, error);
        // Continue with other layers even if one fails
      }
    }

    // Convert canvas to image
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Failed to create composited image blob'));
          return;
        }
        
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load composited image'));
        img.src = URL.createObjectURL(blob);
      });
    });
  }

  /**
   * Load sprite image for a specific layer and animation
   */
  private async loadLayerSprite(layer: CompositeLayerInfo, animation: LPCAnimation, frameSize: number): Promise<HTMLImageElement> {
    // For now, try to find individual layer files in the Universal LPC structure
    // If not found, fall back to composited files
    
    const potentialPaths = [
      // Try Universal LPC structure first
      `${this.basePath}/${layer.fileName.replace('.png', '')}/${animation}.png`,
      
      // Try standard directory structure
      `${this.basePath}/layers/${layer.name.toLowerCase()}/${animation}.png`,
      
      // Fall back to composited standard files if individual layers don't exist
      `${this.basePath}/standard/${animation}.png`
    ];

    for (const path of potentialPaths) {
      try {
        return await this.loadImage(path);
      } catch (error) {
        // Continue to next path
      }
    }

    throw new Error(`Could not load layer sprite for ${layer.name}/${animation}`);
  }

  /**
   * Load an image from a URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Get expected frame count for an animation
   */
  private getFrameCountForAnimation(animation: LPCAnimation): number {
    // Standard LPC frame counts
    const frameCounts: Record<LPCAnimation, number> = {
      walk: 9,
      run: 8, 
      idle: 1,
      slash: 6,
      hurt: 6,
      spellcast: 7,
      thrust: 8,
      shoot: 13,
      climb: 2,
      jump: 1,
      sit: 1,
      emote: 1,
      combat_idle: 1,
      backslash: 6,
      halfslash: 3
    };
    
    return frameCounts[animation] || 1;
  }

  /**
   * Check if compositor should be used for this character
   */
  static shouldUseCompositor(config: LPCCharacterConfig): boolean {
    // Use compositor if character has multiple layers defined
    return config.layers && config.layers.length > 1;
  }
}