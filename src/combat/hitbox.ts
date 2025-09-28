/**
 * Combat hitbox system for collision detection and hit events
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export interface Hit {
  sourceId: string;
  targetId: string;
  damage: number;
  stagger: number;
  kind: 'melee' | 'ranged' | 'signature' | 'trap';
  blocked: boolean;
  position: Point2D;
}

/**
 * Check if two AABB rectangles overlap
 */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Check if two circles overlap
 */
export function circleOverlap(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < a.radius + b.radius;
}

/**
 * Check if a point is inside a circle
 */
export function pointInCircle(point: Point2D, circle: Circle): boolean {
  const dx = point.x - circle.x;
  const dy = point.y - circle.y;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

/**
 * Check if a point is inside an AABB
 */
export function pointInAABB(point: Point2D, aabb: AABB): boolean {
  return (
    point.x >= aabb.x &&
    point.x <= aabb.x + aabb.width &&
    point.y >= aabb.y &&
    point.y <= aabb.y + aabb.height
  );
}

/**
 * Check if AABB overlaps with circle
 */
export function aabbCircleOverlap(aabb: AABB, circle: Circle): boolean {
  // Find closest point on AABB to circle center
  const closestX = Math.max(aabb.x, Math.min(circle.x, aabb.x + aabb.width));
  const closestY = Math.max(aabb.y, Math.min(circle.y, aabb.y + aabb.height));

  // Check if closest point is within circle radius
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

/**
 * Calculate distance between two points
 */
export function distance(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points in radians
 */
export function angle(from: Point2D, to: Point2D): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * Normalize angle to 0-2π range
 */
export function normalizeAngle(radians: number): number {
  const TWO_PI = Math.PI * 2;
  let normalized = radians % TWO_PI;
  if (normalized < 0) {
    normalized += TWO_PI;
  }
  return normalized;
}

/**
 * Check if target angle is within arc from source direction
 */
export function withinArc(
  sourceAngle: number,
  targetAngle: number,
  arcRadians: number
): boolean {
  const normalizedSource = normalizeAngle(sourceAngle);
  const normalizedTarget = normalizeAngle(targetAngle);

  const angleDiff = Math.abs(normalizedTarget - normalizedSource);
  const minDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);

  return minDiff <= arcRadians / 2;
}
