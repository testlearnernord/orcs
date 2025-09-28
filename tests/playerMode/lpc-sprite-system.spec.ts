/**
 * Tests for the Universal LPC Sprite System
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  LPCAnimator,
  LPCRenderer,
  LPCCharacterLoader,
  LPC_DIRECTION_ROWS,
  LPC_FRAME_COUNTS,
  LPC_FRAME_TIMING,
  type LPCAnimation,
  type LPCDirection
} from '../../src/playerMode/visual/lpc';

describe('LPC Animation System', () => {
  describe('LPC Constants', () => {
    it('should have correct direction row mapping based on empirical berserker sprite layout', () => {
      // Empirically determined mapping based on actual berserker sprite behavior
      // This deviates from the Universal LPC standard but matches the actual sprite files
      expect(LPC_DIRECTION_ROWS.U).toBe(0); // Up -> Row 0 (verified correct)
      expect(LPC_DIRECTION_ROWS.L).toBe(3); // Left -> Row 3 (empirically determined)
      expect(LPC_DIRECTION_ROWS.D).toBe(1); // Down -> Row 1 (empirically determined)
      expect(LPC_DIRECTION_ROWS.R).toBe(2); // Right -> Row 2 (empirically determined)
    });

    it('should have standard frame counts for LPC animations', () => {
      expect(LPC_FRAME_COUNTS.walk).toBe(9);
      expect(LPC_FRAME_COUNTS.run).toBe(8);
      expect(LPC_FRAME_COUNTS.idle).toBe(2);
      expect(LPC_FRAME_COUNTS.slash).toBe(6);
      expect(LPC_FRAME_COUNTS.hurt).toBe(6);
      expect(LPC_FRAME_COUNTS.shoot).toBe(13);
    });

    it('should have reasonable frame timing for animations', () => {
      expect(LPC_FRAME_TIMING.walk).toBeGreaterThan(0);
      expect(LPC_FRAME_TIMING.run).toBeLessThan(LPC_FRAME_TIMING.walk); // Run should be faster
      expect(LPC_FRAME_TIMING.idle).toBeGreaterThan(LPC_FRAME_TIMING.walk); // Idle should be slower
    });
  });

  describe('LPCAnimator', () => {
    let animator: LPCAnimator;

    beforeEach(() => {
      animator = new LPCAnimator(64, 64);
    });

    it('should initialize with no current animation', () => {
      expect(animator.getCurrentAnimation()).toBeNull();
      expect(animator.getCurrentFrame()).toBeNull();
      expect(animator.isFinished()).toBe(true);
    });

    it('should start playing an animation', () => {
      animator.play('walk', 'D', true);

      const currentAnim = animator.getCurrentAnimation();
      expect(currentAnim).not.toBeNull();
      expect(currentAnim?.animation).toBe('walk');
      expect(currentAnim?.direction).toBe('D');
      expect(animator.isPlaying()).toBe(true);
    });

    it('should generate correct frame coordinates', () => {
      animator.play('walk', 'D', true);

      const frame = animator.getCurrentFrame();
      expect(frame).not.toBeNull();
      expect(frame?.col).toBe(0); // First frame
      expect(frame?.row).toBe(LPC_DIRECTION_ROWS.D); // Down direction
      expect(frame?.x).toBe(0); // First column
      expect(frame?.y).toBe(LPC_DIRECTION_ROWS.D * 64); // Row * frame height
    });

    it('should handle animation looping', () => {
      animator.play('walk', 'D', true);

      // Force animation to end by updating with large time gap
      const originalNow = Date.now;
      Date.now = () => originalNow() + 10000; // Add 10 seconds

      animator.update();

      // Should still be playing (looped)
      expect(animator.isPlaying()).toBe(true);
      expect(animator.isFinished()).toBe(false);

      Date.now = originalNow; // Restore original Date.now
    });

    it('should handle non-looping animations', () => {
      animator.play('slash', 'D', false);

      // Force animation to end
      const originalNow = Date.now;
      Date.now = () => originalNow() + 10000;

      animator.update();

      // Should be finished (not looped)
      expect(animator.isFinished()).toBe(true);

      Date.now = originalNow;
    });
  });

  describe('LPCRenderer', () => {
    let renderer: LPCRenderer;

    beforeEach(() => {
      renderer = new LPCRenderer({
        archetype: 'Berserker',
        frameSize: 64
      });
    });

    it('should initialize with correct archetype', () => {
      expect(renderer.isReady()).toBe(false); // Not loaded yet
    });

    it('should handle render state updates', () => {
      const renderState = {
        position: { x: 100, y: 100 },
        direction: 'D' as LPCDirection,
        animation: 'walk' as LPCAnimation,
        isMoving: true,
        isAttacking: false,
        isHurt: false,
        speed: 1.0
      };

      // Should not throw even when sprites aren't loaded
      expect(() => renderer.update(renderState)).not.toThrow();
    });
  });

  describe('LPCCharacterLoader', () => {
    it('should validate LPC animation names correctly', () => {
      // Access private method via any for testing
      const isValid = (LPCCharacterLoader as any).isValidLPCAnimation;

      expect(isValid('walk')).toBe(true);
      expect(isValid('run')).toBe(true);
      expect(isValid('idle')).toBe(true);
      expect(isValid('slash')).toBe(true);
      expect(isValid('invalid_animation')).toBe(false);
      expect(isValid('')).toBe(false);
    });

    it('should create correct animation atlas configuration', () => {
      const atlas = LPCCharacterLoader.createAnimationAtlas(
        'walk',
        '/test/path',
        64,
        { walk: 9, run: 8 }
      );

      expect(atlas.url).toBe('/test/path/walk_64.png');
      expect(atlas.frameWidth).toBe(64);
      expect(atlas.frameHeight).toBe(64);
      expect(atlas.cols).toBe(9);
      expect(atlas.rows).toBe(4);
      expect(atlas.frameCount).toBe(9);
    });
  });
});

describe('LPC System Integration', () => {
  it('should have consistent direction mapping with berserker sprite system', () => {
    // This ensures our LPC system works correctly with the actual berserker sprites
    const directions: LPCDirection[] = ['U', 'D', 'L', 'R'];

    for (const dir of directions) {
      const row = LPC_DIRECTION_ROWS[dir];
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(4);
    }

    // Specific mapping verification based on empirical testing with berserker sprites
    expect(LPC_DIRECTION_ROWS.U).toBe(0); // Up -> Row 0 (verified correct)
    expect(LPC_DIRECTION_ROWS.L).toBe(3); // Left -> Row 3 (empirically determined)
    expect(LPC_DIRECTION_ROWS.D).toBe(1); // Down -> Row 1 (empirically determined)
    expect(LPC_DIRECTION_ROWS.R).toBe(2); // Right -> Row 2 (empirically determined)
  });
});
