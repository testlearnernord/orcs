/**
 * Projectile system for ranged combat (arrows, etc.)
 */

import type { Point2D, Hit } from './hitbox';
import { distance, angle } from './hitbox';

export interface Projectile {
  id: string;
  sourceId: string;
  position: Point2D;
  velocity: Point2D;
  damage: number;
  stagger: number;
  lifetime: number;
  maxLifetime: number;
  size: number;
  kind: 'arrow' | 'bolt' | 'magic';
  autoAimTarget?: string;
  isActive: boolean;
}

export interface ProjectileTarget {
  id: string;
  position: Point2D;
  radius: number;
}

export type ProjectileHitCallback = (projectile: Projectile, target: ProjectileTarget) => void;

/**
 * Manager for all projectiles in the combat system
 */
export class ProjectileManager {
  private projectiles = new Map<string, Projectile>();
  private nextId = 0;
  private onHit?: ProjectileHitCallback;

  constructor(onHit?: ProjectileHitCallback) {
    this.onHit = onHit;
  }

  /**
   * Create a new projectile
   */
  createProjectile(
    sourceId: string,
    startPos: Point2D,
    targetPos: Point2D,
    damage: number,
    stagger: number = 0,
    speed: number = 5.0,
    maxLifetime: number = 3000,
    kind: Projectile['kind'] = 'arrow',
    autoAimTarget?: string
  ): string {
    const id = `projectile_${this.nextId++}`;
    
    // Calculate velocity vector
    const direction = angle(startPos, targetPos);
    const velocity: Point2D = {
      x: Math.cos(direction) * speed,
      y: Math.sin(direction) * speed
    };

    const projectile: Projectile = {
      id,
      sourceId,
      position: { ...startPos },
      velocity,
      damage,
      stagger,
      lifetime: 0,
      maxLifetime,
      size: kind === 'arrow' ? 0.1 : 0.15,
      kind,
      autoAimTarget,
      isActive: true
    };

    this.projectiles.set(id, projectile);
    return id;
  }

  /**
   * Create multiple projectiles in a spread pattern (for signature moves like Volley)
   */
  createSpread(
    sourceId: string,
    startPos: Point2D,
    targetPos: Point2D,
    count: number,
    spreadAngle: number,
    damage: number,
    stagger: number = 0,
    speed: number = 5.0,
    maxLifetime: number = 3000,
    kind: Projectile['kind'] = 'arrow',
    autoAimTarget?: string
  ): string[] {
    const projectileIds: string[] = [];
    const baseDirection = angle(startPos, targetPos);
    const halfSpread = spreadAngle / 2;
    const angleStep = count > 1 ? spreadAngle / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const currentAngle = baseDirection - halfSpread + (i * angleStep);
      
      // Calculate target position for this projectile
      const projectileTarget: Point2D = {
        x: startPos.x + Math.cos(currentAngle) * 10, // Arbitrary distance for direction
        y: startPos.y + Math.sin(currentAngle) * 10
      };

      const id = this.createProjectile(
        sourceId,
        startPos,
        projectileTarget,
        damage,
        stagger,
        speed,
        maxLifetime,
        kind,
        autoAimTarget
      );
      
      projectileIds.push(id);
    }

    return projectileIds;
  }

  /**
   * Update all projectiles (call each frame)
   */
  update(deltaMs: number, targets: ProjectileTarget[]): Hit[] {
    const hits: Hit[] = [];

    for (const [id, projectile] of this.projectiles) {
      if (!projectile.isActive) continue;

      // Update lifetime
      projectile.lifetime += deltaMs;
      if (projectile.lifetime >= projectile.maxLifetime) {
        this.removeProjectile(id);
        continue;
      }

      // Apply auto-aim if target exists
      if (projectile.autoAimTarget) {
        const target = targets.find(t => t.id === projectile.autoAimTarget);
        if (target) {
          const aimStrength = 0.1; // Subtle correction
          const toTarget = angle(projectile.position, target.position);
          const currentDirection = Math.atan2(projectile.velocity.y, projectile.velocity.x);
          const speed = Math.sqrt(projectile.velocity.x ** 2 + projectile.velocity.y ** 2);
          
          // Lerp towards target direction
          const newDirection = currentDirection + (toTarget - currentDirection) * aimStrength;
          projectile.velocity.x = Math.cos(newDirection) * speed;
          projectile.velocity.y = Math.sin(newDirection) * speed;
        }
      }

      // Update position
      const deltaSeconds = deltaMs / 1000;
      projectile.position.x += projectile.velocity.x * deltaSeconds;
      projectile.position.y += projectile.velocity.y * deltaSeconds;

      // Check for hits
      for (const target of targets) {
        if (target.id === projectile.sourceId) continue; // Don't hit self

        const dist = distance(projectile.position, target.position);
        if (dist <= (target.radius + projectile.size)) {
          // Hit detected
          const hit: Hit = {
            sourceId: projectile.sourceId,
            targetId: target.id,
            damage: projectile.damage,
            stagger: projectile.stagger,
            kind: 'ranged',
            blocked: false, // Blocking will be handled by target
            position: { ...projectile.position }
          };

          hits.push(hit);

          if (this.onHit) {
            this.onHit(projectile, target);
          }

          this.removeProjectile(id);
          break;
        }
      }
    }

    return hits;
  }

  /**
   * Get all active projectiles
   */
  getProjectiles(): Projectile[] {
    return Array.from(this.projectiles.values()).filter(p => p.isActive);
  }

  /**
   * Remove a projectile
   */
  removeProjectile(id: string): boolean {
    return this.projectiles.delete(id);
  }

  /**
   * Clear all projectiles
   */
  clear(): void {
    this.projectiles.clear();
    this.nextId = 0;
  }

  /**
   * Get projectile count (for debugging)
   */
  getCount(): number {
    return this.projectiles.size;
  }
}