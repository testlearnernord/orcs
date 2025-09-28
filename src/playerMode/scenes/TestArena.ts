/**
 * Test Arena scene for Player Mode combat testing
 */

import type { Point2D } from '../../combat/hitbox';
import type { OrcArchetype } from '../../simulation/archetypes';
import { ARCHETYPES, ARCHETYPE_STATS } from '../../simulation/archetypes';
import { HealthManager } from '../../combat/health';

export interface ArenaEntity {
  id: string;
  archetype: OrcArchetype;
  position: Point2D;
  rotation: number;
  health: HealthManager;
  isPlayer: boolean;
  isAlive: boolean;
  lastAction: number;
  aiState: 'idle' | 'seeking' | 'attacking' | 'fleeing';
  aiTarget?: string;
}

export interface ArenaWave {
  entities: ArenaEntity[];
  isComplete: boolean;
  startTime: number;
}

/**
 * Manages the test arena with enemies and objectives
 */
export class TestArena {
  private entities = new Map<string, ArenaEntity>();
  private nextEntityId = 0;
  private currentWave?: ArenaWave;
  private playerSpawn: Point2D = { x: 0, y: 0 };
  private enemySpawns: Point2D[] = [
    { x: -4, y: -4 },  // Top-left
    { x: 4, y: -4 },   // Top-right
    { x: 0, y: 4 }     // Bottom
  ];

  constructor() {
    this.reset();
  }

  /**
   * Get all entities in the arena
   */
  getEntities(): ArenaEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get alive entities only
   */
  getAliveEntities(): ArenaEntity[] {
    return this.getEntities().filter(e => e.isAlive);
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): ArenaEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get player entity
   */
  getPlayer(): ArenaEntity | undefined {
    return this.getEntities().find(e => e.isPlayer);
  }

  /**
   * Get enemy entities
   */
  getEnemies(): ArenaEntity[] {
    return this.getEntities().filter(e => !e.isPlayer && e.isAlive);
  }

  /**
   * Create player entity
   */
  createPlayer(archetype: OrcArchetype = 'Berserker'): string {
    const id = `player_${this.nextEntityId++}`;
    const stats = ARCHETYPE_STATS[archetype];
    
    const entity: ArenaEntity = {
      id,
      archetype,
      position: { ...this.playerSpawn },
      rotation: 0,
      health: new HealthManager(
        id, 
        stats.health, 
        100, // Max stagger
        (entityId) => this.onEntityDeath(entityId)
      ),
      isPlayer: true,
      isAlive: true,
      lastAction: Date.now(),
      aiState: 'idle'
    };

    this.entities.set(id, entity);
    return id;
  }

  /**
   * Create enemy entity
   */
  createEnemy(archetype: OrcArchetype, spawnIndex: number = 0): string {
    const id = `enemy_${this.nextEntityId++}`;
    const stats = ARCHETYPE_STATS[archetype];
    const spawn = this.enemySpawns[spawnIndex % this.enemySpawns.length];
    
    const entity: ArenaEntity = {
      id,
      archetype,
      position: { ...spawn },
      rotation: 0,
      health: new HealthManager(
        id, 
        stats.health, 
        80, // Max stagger for enemies
        (entityId) => this.onEntityDeath(entityId)
      ),
      isPlayer: false,
      isAlive: true,
      lastAction: Date.now(),
      aiState: 'idle'
    };

    this.entities.set(id, entity);
    return id;
  }

  /**
   * Start a new wave with one of each archetype
   */
  startWave(): void {
    this.clearEnemies();
    
    const entities: ArenaEntity[] = [];
    const startTime = Date.now();

    // Create one enemy of each archetype
    ARCHETYPES.forEach((archetype, index) => {
      const enemyId = this.createEnemy(archetype, index);
      const enemy = this.getEntity(enemyId);
      if (enemy) {
        entities.push(enemy);
      }
    });

    this.currentWave = {
      entities,
      isComplete: false,
      startTime
    };
  }

  /**
   * Update arena (call each frame)
   */
  update(deltaMs: number): void {
    const now = Date.now();
    
    // Update all entities
    for (const entity of this.entities.values()) {
      if (!entity.isAlive) continue;
      
      if (!entity.isPlayer) {
        this.updateEnemyAI(entity, deltaMs, now);
      }
    }

    // Check wave completion
    if (this.currentWave && !this.currentWave.isComplete) {
      const aliveEnemies = this.getEnemies();
      if (aliveEnemies.length === 0) {
        this.currentWave.isComplete = true;
      }
    }
  }

  /**
   * Reset arena to initial state
   */
  reset(): void {
    this.entities.clear();
    this.nextEntityId = 0;
    this.currentWave = undefined;
    
    // Create player
    this.createPlayer();
    
    // Start first wave
    this.startWave();
  }

  /**
   * Get current wave info
   */
  getCurrentWave(): ArenaWave | undefined {
    return this.currentWave;
  }

  /**
   * Check if wave is complete
   */
  isWaveComplete(): boolean {
    return this.currentWave?.isComplete ?? false;
  }

  /**
   * Move entity to position
   */
  moveEntity(id: string, position: Point2D, rotation?: number): boolean {
    const entity = this.entities.get(id);
    if (!entity || !entity.isAlive) return false;
    
    entity.position = { ...position };
    if (rotation !== undefined) {
      entity.rotation = rotation;
    }
    return true;
  }

  /**
   * Get spawn positions
   */
  getPlayerSpawn(): Point2D {
    return { ...this.playerSpawn };
  }

  getEnemySpawns(): Point2D[] {
    return this.enemySpawns.map(spawn => ({ ...spawn }));
  }

  private clearEnemies(): void {
    const enemies = this.getEntities().filter(e => !e.isPlayer);
    for (const enemy of enemies) {
      this.entities.delete(enemy.id);
    }
  }

  private onEntityDeath(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.isAlive = false;
      entity.aiState = 'idle';
    }
  }

  private updateEnemyAI(entity: ArenaEntity, deltaMs: number, now: number): void {
    const player = this.getPlayer();
    if (!player || !player.isAlive) return;

    // Simple AI: move towards player every second
    if (now - entity.lastAction > 1000) {
      const dx = player.position.x - entity.position.x;
      const dy = player.position.y - entity.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0.5) {
        // Move towards player
        const moveSpeed = ARCHETYPE_STATS[entity.archetype].speed * 0.5; // Slower than player
        const moveX = (dx / distance) * moveSpeed * (deltaMs / 1000);
        const moveY = (dy / distance) * moveSpeed * (deltaMs / 1000);
        
        entity.position.x += moveX;
        entity.position.y += moveY;
        entity.rotation = Math.atan2(dy, dx);
        entity.aiState = 'seeking';
      } else {
        entity.aiState = 'attacking';
      }
      
      entity.lastAction = now;
    }
  }
}