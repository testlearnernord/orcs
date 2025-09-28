/**
 * Health and stagger system for combat entities
 */

export interface HealthState {
  current: number;
  maximum: number;
  isDead: boolean;
  stagger: number;
  maxStagger: number;
  isStaggered: boolean;
  lastDamageTime: number;
}

export interface DamageResult {
  damageDealt: number;
  healthRemaining: number;
  wasKilled: boolean;
  staggerApplied: number;
  wasStaggered: boolean;
}

export type DeathCallback = (entityId: string) => void;
export type StaggerCallback = (entityId: string, duration: number) => void;

/**
 * Health manager for a combat entity
 */
export class HealthManager {
  private state: HealthState;
  private entityId: string;
  private onDeath?: DeathCallback;
  private onStagger?: StaggerCallback;

  constructor(
    entityId: string,
    maxHealth: number,
    maxStagger: number = 100,
    onDeath?: DeathCallback,
    onStagger?: StaggerCallback
  ) {
    this.entityId = entityId;
    this.onDeath = onDeath;
    this.onStagger = onStagger;
    
    this.state = {
      current: maxHealth,
      maximum: maxHealth,
      isDead: false,
      stagger: 0,
      maxStagger,
      isStaggered: false,
      lastDamageTime: 0
    };
  }

  /**
   * Get current health state
   */
  getState(): Readonly<HealthState> {
    return { ...this.state };
  }

  /**
   * Get health percentage (0-1)
   */
  getHealthPercent(): number {
    return this.state.maximum > 0 ? this.state.current / this.state.maximum : 0;
  }

  /**
   * Get stagger percentage (0-1)
   */
  getStaggerPercent(): number {
    return this.state.maxStagger > 0 ? this.state.stagger / this.state.maxStagger : 0;
  }

  /**
   * Apply damage and stagger to this entity
   */
  takeDamage(damage: number, staggerAmount: number = 0): DamageResult {
    if (this.state.isDead) {
      return {
        damageDealt: 0,
        healthRemaining: 0,
        wasKilled: false,
        staggerApplied: 0,
        wasStaggered: false
      };
    }

    const actualDamage = Math.max(0, Math.min(damage, this.state.current));
    const actualStagger = Math.max(0, staggerAmount);

    this.state.current -= actualDamage;
    this.state.stagger = Math.min(this.state.maxStagger, this.state.stagger + actualStagger);
    this.state.lastDamageTime = Date.now();

    const wasKilled = this.state.current <= 0;
    if (wasKilled) {
      this.state.isDead = true;
      this.state.current = 0;
      if (this.onDeath) {
        this.onDeath(this.entityId);
      }
    }

    const wasStaggered = !this.state.isStaggered && this.state.stagger >= this.state.maxStagger;
    if (wasStaggered) {
      this.state.isStaggered = true;
      // Stagger duration based on excess stagger amount
      const staggerTime = 800 + Math.min(500, this.state.stagger - this.state.maxStagger);
      if (this.onStagger) {
        this.onStagger(this.entityId, staggerTime);
      }
      // Reset stagger after applying it
      setTimeout(() => {
        this.state.isStaggered = false;
        this.state.stagger = 0;
      }, staggerTime);
    }

    return {
      damageDealt: actualDamage,
      healthRemaining: this.state.current,
      wasKilled,
      staggerApplied: actualStagger,
      wasStaggered
    };
  }

  /**
   * Heal this entity
   */
  heal(amount: number): number {
    if (this.state.isDead) return 0;
    
    const actualHeal = Math.max(0, Math.min(amount, this.state.maximum - this.state.current));
    this.state.current += actualHeal;
    return actualHeal;
  }

  /**
   * Reduce stagger amount (for recovery over time)
   */
  reduceStagger(amount: number): number {
    const actualReduction = Math.max(0, Math.min(amount, this.state.stagger));
    this.state.stagger -= actualReduction;
    return actualReduction;
  }

  /**
   * Reset to full health and clear stagger
   */
  reset(): void {
    this.state.current = this.state.maximum;
    this.state.stagger = 0;
    this.state.isDead = false;
    this.state.isStaggered = false;
    this.state.lastDamageTime = 0;
  }

  /**
   * Check if entity can act (not dead or staggered)
   */
  canAct(): boolean {
    return !this.state.isDead && !this.state.isStaggered;
  }

  /**
   * Check if entity has taken damage recently
   */
  hasRecentDamage(thresholdMs: number = 1000): boolean {
    return Date.now() - this.state.lastDamageTime < thresholdMs;
  }
}