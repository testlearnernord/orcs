/**
 * Orbit movement system for lock-on combat
 * Implements soulslike orbit mechanics where WASD moves relative to locked target
 */

import type { Point2D } from '../../combat/hitbox';

/**
 * Vector operations utilities
 */
function vecSub(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

function vecAdd(a: Point2D, b: Point2D): Point2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

function vecScale(v: Point2D, scale: number): Point2D {
  return { x: v.x * scale, y: v.y * scale };
}

function vecNorm(v: Point2D): Point2D {
  const length = Math.sqrt(v.x * v.x + v.y * v.y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: v.x / length, y: v.y / length };
}

/**
 * Calculate orbit velocity based on input relative to target
 * W/S = forward/backward on the line Player↔Target
 * A/D = strafe tangentially around the target
 */
export function orbitVelocity(
  input: { w: number; a: number; s: number; d: number },
  playerPos: Point2D,
  targetPos: Point2D,
  speed: number
): Point2D {
  const toTarget = vecNorm(vecSub(targetPos, playerPos)); // n
  const right = { x: -toTarget.y, y: toTarget.x }; // t (tangent)
  const forward = { x: toTarget.x, y: toTarget.y }; // along the axis

  const v = vecAdd(
    vecScale(forward, (input.w - input.s) * speed),
    vecScale(right, (input.d - input.a) * speed)
  );

  return v; // in world coordinates
}

/**
 * Convert WASD boolean inputs to normalized values for orbit movement
 */
export function inputToOrbitValues(input: {
  moveUp: boolean;
  moveDown: boolean;
  moveLeft: boolean;
  moveRight: boolean;
}): { w: number; a: number; s: number; d: number } {
  return {
    w: input.moveUp ? 1 : 0,
    s: input.moveDown ? 1 : 0,
    a: input.moveLeft ? 1 : 0,
    d: input.moveRight ? 1 : 0
  };
}

/**
 * Direction quantization for facing the target
 */
export function dirFromAngle(rad: number): 'L' | 'R' | 'U' | 'D' {
  const a = (rad + Math.PI * 2) % (Math.PI * 2);
  
  if (a > Math.PI * 3/4 && a <= Math.PI * 5/4) {
    return 'L'; // Left
  } else if (a > Math.PI * 5/4 && a <= Math.PI * 7/4) {
    return 'D'; // Down
  } else if (a > Math.PI * 7/4 || a <= Math.PI * 1/4) {
    return 'R'; // Right
  } else {
    return 'U'; // Up
  }
}