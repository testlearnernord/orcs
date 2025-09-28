import { describe, expect, it } from 'vitest';
import {
  aabbOverlap,
  circleOverlap,
  pointInCircle,
  distance,
  angle
} from '../../src/combat/hitbox';
import { HealthManager } from '../../src/combat/health';

describe('player-mode combat systems', () => {
  describe('hitbox detection', () => {
    it('should detect AABB overlaps correctly', () => {
      const boxA = { x: 0, y: 0, width: 10, height: 10 };
      const boxB = { x: 5, y: 5, width: 10, height: 10 };
      const boxC = { x: 20, y: 20, width: 10, height: 10 };

      expect(aabbOverlap(boxA, boxB)).toBe(true);
      expect(aabbOverlap(boxA, boxC)).toBe(false);
    });

    it('should detect circle overlaps correctly', () => {
      const circleA = { x: 0, y: 0, radius: 5 };
      const circleB = { x: 7, y: 0, radius: 5 };
      const circleC = { x: 20, y: 0, radius: 5 };

      expect(circleOverlap(circleA, circleB)).toBe(true);
      expect(circleOverlap(circleA, circleC)).toBe(false);
    });

    it('should detect point in circle correctly', () => {
      const circle = { x: 0, y: 0, radius: 10 };

      expect(pointInCircle({ x: 5, y: 5 }, circle)).toBe(true);
      expect(pointInCircle({ x: 15, y: 0 }, circle)).toBe(false);
    });

    it('should calculate distance correctly', () => {
      const pointA = { x: 0, y: 0 };
      const pointB = { x: 3, y: 4 };

      expect(distance(pointA, pointB)).toBe(5);
    });

    it('should calculate angle correctly', () => {
      const from = { x: 0, y: 0 };
      const to = { x: 1, y: 0 };

      expect(angle(from, to)).toBe(0);
    });
  });

  describe('health system', () => {
    it('should initialize with full health', () => {
      const health = new HealthManager('test', 100);
      const state = health.getState();

      expect(state.current).toBe(100);
      expect(state.maximum).toBe(100);
      expect(state.isDead).toBe(false);
    });

    it('should take damage correctly', () => {
      const health = new HealthManager('test', 100);

      const result = health.takeDamage(30);

      expect(result.damageDealt).toBe(30);
      expect(result.healthRemaining).toBe(70);
      expect(result.wasKilled).toBe(false);
    });

    it('should die when health reaches zero', () => {
      let deathCalled = false;
      const health = new HealthManager('test', 50, 100, () => {
        deathCalled = true;
      });

      const result = health.takeDamage(60);

      expect(result.wasKilled).toBe(true);
      expect(health.getState().isDead).toBe(true);
      expect(deathCalled).toBe(true);
    });

    it('should heal correctly', () => {
      const health = new HealthManager('test', 100);
      health.takeDamage(50);

      const healed = health.heal(20);

      expect(healed).toBe(20);
      expect(health.getState().current).toBe(70);
    });

    it('should not heal beyond maximum', () => {
      const health = new HealthManager('test', 100);
      health.takeDamage(10);

      const healed = health.heal(50);

      expect(healed).toBe(10);
      expect(health.getState().current).toBe(100);
    });
  });
});
