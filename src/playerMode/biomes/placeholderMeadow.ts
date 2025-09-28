/**
 * Placeholder Meadow biome for Player Mode arena
 * Provides a pleasant grass environment instead of gray background
 */

export interface BiomeConfig {
  id: string;
  name: string;
  palette: {
    background: string;
    grass: string;
    grassDark: string;
    accent: string;
  };
  decorations: {
    density: number; // 0-1, how many decorative elements per chunk
    types: string[];
  };
}

export interface DecorationElement {
  type: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
}

/**
 * Meadow biome renderer for test arena
 */
export class PlaceholderMeadowBiome {
  private config: BiomeConfig;
  private decorationCache: Map<string, DecorationElement[]> = new Map();
  
  constructor() {
    this.config = {
      id: 'placeholder_meadow',
      name: 'Placeholder Meadow',
      palette: {
        background: '#4a7c59',    // Base grass green
        grass: '#5a8a6a',         // Lighter grass
        grassDark: '#3a6c49',     // Darker grass
        accent: '#7bb585'         // Highlight grass
      },
      decorations: {
        density: 0.3,
        types: ['flower', 'rock', 'grass_tuft', 'dirt_patch']
      }
    };
  }

  /**
   * Render the biome background and decorations
   */
  render(ctx: CanvasRenderingContext2D, cameraPos: { x: number; y: number }, viewportSize: { width: number; height: number }): void {
    // Draw base background
    this.renderBackground(ctx, cameraPos, viewportSize);
    
    // Draw grid pattern (subtle)
    this.renderGrassGrid(ctx, cameraPos, viewportSize);
    
    // Draw decorative elements
    this.renderDecorations(ctx, cameraPos, viewportSize);
    
    // Draw parallax background elements
    this.renderParallaxLayer(ctx, cameraPos, viewportSize);
  }

  /**
   * Draw the base grass background
   */
  private renderBackground(ctx: CanvasRenderingContext2D, cameraPos: { x: number; y: number }, viewportSize: { width: number; height: number }): void {
    ctx.fillStyle = this.config.palette.background;
    ctx.fillRect(0, 0, viewportSize.width, viewportSize.height);
  }

  /**
   * Draw subtle grid pattern to give texture
   */
  private renderGrassGrid(ctx: CanvasRenderingContext2D, cameraPos: { x: number; y: number }, viewportSize: { width: number; height: number }): void {
    const scale = 50; // Grid scale
    const startX = Math.floor(cameraPos.x - viewportSize.width / 2 / scale) * scale;
    const startY = Math.floor(cameraPos.y - viewportSize.height / 2 / scale) * scale;
    const endX = startX + viewportSize.width / scale * scale + scale * 2;
    const endY = startY + viewportSize.height / scale * scale + scale * 2;

    ctx.strokeStyle = this.config.palette.grassDark;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.1;

    // Vertical lines
    for (let x = startX; x <= endX; x += scale) {
      const screenX = viewportSize.width / 2 + (x - cameraPos.x) * scale;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, viewportSize.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += scale) {
      const screenY = viewportSize.height / 2 + (y - cameraPos.y) * scale;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(viewportSize.width, screenY);
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
  }

  /**
   * Draw decorative elements (flowers, rocks, etc.)
   */
  private renderDecorations(ctx: CanvasRenderingContext2D, cameraPos: { x: number; y: number }, viewportSize: { width: number; height: number }): void {
    const chunkSize = 100; // Size of each decoration chunk
    const viewRadius = Math.max(viewportSize.width, viewportSize.height) / 2 + 100;
    
    // Calculate visible chunks
    const startChunkX = Math.floor((cameraPos.x - viewRadius) / chunkSize);
    const endChunkX = Math.ceil((cameraPos.x + viewRadius) / chunkSize);
    const startChunkY = Math.floor((cameraPos.y - viewRadius) / chunkSize);
    const endChunkY = Math.ceil((cameraPos.y + viewRadius) / chunkSize);

    for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
      for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
        const chunkKey = `${chunkX},${chunkY}`;
        
        if (!this.decorationCache.has(chunkKey)) {
          this.decorationCache.set(chunkKey, this.generateChunkDecorations(chunkX, chunkY, chunkSize));
        }

        const decorations = this.decorationCache.get(chunkKey)!;
        this.renderChunkDecorations(ctx, decorations, cameraPos, viewportSize);
      }
    }
  }

  /**
   * Generate decorations for a specific chunk
   */
  private generateChunkDecorations(chunkX: number, chunkY: number, chunkSize: number): DecorationElement[] {
    const decorations: DecorationElement[] = [];
    
    // Use chunk coordinates as seed for consistent generation
    const seed = chunkX * 1000 + chunkY;
    const rng = this.seededRandom(seed);
    
    const decorationCount = Math.floor(this.config.decorations.density * 8); // 8 max decorations per chunk
    
    for (let i = 0; i < decorationCount; i++) {
      const type = this.config.decorations.types[Math.floor(rng() * this.config.decorations.types.length)];
      
      decorations.push({
        type,
        x: chunkX * chunkSize + rng() * chunkSize,
        y: chunkY * chunkSize + rng() * chunkSize,
        size: 3 + rng() * 5, // 3-8 size
        rotation: rng() * Math.PI * 2,
        color: this.getDecorationColor(type, rng)
      });
    }
    
    return decorations;
  }

  /**
   * Render decorations for a chunk
   */
  private renderChunkDecorations(ctx: CanvasRenderingContext2D, decorations: DecorationElement[], cameraPos: { x: number; y: number }, viewportSize: { width: number; height: number }): void {
    decorations.forEach(decoration => {
      const screenX = viewportSize.width / 2 + (decoration.x - cameraPos.x) * 50;
      const screenY = viewportSize.height / 2 + (decoration.y - cameraPos.y) * 50;
      
      // Only render if on screen
      if (screenX < -20 || screenX > viewportSize.width + 20 || 
          screenY < -20 || screenY > viewportSize.height + 20) {
        return;
      }

      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.rotate(decoration.rotation);
      
      this.drawDecoration(ctx, decoration.type, decoration.size, decoration.color);
      
      ctx.restore();
    });
  }

  /**
   * Draw a specific decoration type
   */
  private drawDecoration(ctx: CanvasRenderingContext2D, type: string, size: number, color: string): void {
    ctx.fillStyle = color;
    
    switch (type) {
      case 'flower':
        // Simple flower shape
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffff88';
        ctx.beginPath();
        ctx.arc(0, 0, size / 4, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'rock':
        // Small rock
        ctx.fillRect(-size / 2, -size / 2, size, size);
        break;
        
      case 'grass_tuft':
        // Grass tuft
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(-1 + i * 0.5, -size / 2, 1, size);
        }
        break;
        
      case 'dirt_patch':
        // Dirt patch
        ctx.fillStyle = '#8b7355';
        ctx.beginPath();
        ctx.ellipse(0, 0, size, size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  /**
   * Get appropriate color for decoration type
   */
  private getDecorationColor(type: string, rng: () => number): string {
    switch (type) {
      case 'flower':
        {
          const flowers = ['#ff6b9d', '#ffa726', '#66bb6a', '#ab47bc'];
          return flowers[Math.floor(rng() * flowers.length)];
        }
      case 'rock':
        return '#757575';
      case 'grass_tuft':
        return this.config.palette.accent;
      case 'dirt_patch':
        return '#8d6e63';
      default:
        return this.config.palette.grass;
    }
  }

  /**
   * Render parallax background layer for depth
   */
  private renderParallaxLayer(ctx: CanvasRenderingContext2D, cameraPos: { x: number; y: number }, viewportSize: { width: number; height: number }): void {
    const parallaxSpeed = 0.9; // Slightly slower than camera
    const offsetX = cameraPos.x * parallaxSpeed;
    const offsetY = cameraPos.y * parallaxSpeed;
    
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = this.config.palette.accent;
    
    // Draw some distant grass patches
    for (let i = 0; i < 5; i++) {
      const x = viewportSize.width / 2 + ((i * 200 - offsetX) % (viewportSize.width + 100)) - 50;
      const y = viewportSize.height / 2 + ((i * 150 - offsetY) % (viewportSize.height + 100)) - 50;
      
      ctx.beginPath();
      ctx.ellipse(x, y, 30 + i * 5, 20 + i * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1.0;
  }

  /**
   * Simple seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  /**
   * Get biome configuration
   */
  getConfig(): BiomeConfig {
    return { ...this.config };
  }
}