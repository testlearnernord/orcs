/**
 * A* pathfinding for handcrafted maps
 */

import type { HandMapData, GridCoordinate, PixelCoordinate } from './types';
import { pixelToGrid, gridToPixel, isValidGridCoord, gridToIndex } from './types';
import { isBlocked } from './loader';

interface PathNode {
  gx: number;
  gy: number;
  gCost: number; // Distance from start
  hCost: number; // Heuristic distance to end
  fCost: number; // gCost + hCost
  parent: PathNode | null;
}

/**
 * Calculate Manhattan distance between two grid points
 */
function manhattanDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * Get valid neighboring grid coordinates (4-directional movement)
 */
function getNeighbors(gx: number, gy: number, map: HandMapData): GridCoordinate[] {
  const neighbors: GridCoordinate[] = [];
  
  // 4-directional movement: up, down, left, right
  const directions = [
    { gx: 0, gy: -1 }, // up
    { gx: 0, gy: 1 },  // down
    { gx: -1, gy: 0 }, // left
    { gx: 1, gy: 0 }   // right
  ];

  for (const dir of directions) {
    const newGx = gx + dir.gx;
    const newGy = gy + dir.gy;
    
    if (isValidGridCoord(newGx, newGy, map.gridWidth, map.gridHeight) && 
        !isBlocked(map, newGx, newGy)) {
      neighbors.push({ gx: newGx, gy: newGy });
    }
  }

  return neighbors;
}

/**
 * Find path using A* algorithm on the collision grid
 * Returns array of pixel coordinates representing the path
 */
export function findPath(
  map: HandMapData,
  startPx: number,
  startPy: number,
  endPx: number,
  endPy: number
): PixelCoordinate[] {
  // Convert pixel coordinates to grid coordinates
  const start = pixelToGrid(startPx, startPy, map.meta.tileSize);
  const end = pixelToGrid(endPx, endPy, map.meta.tileSize);

  // Check if start and end are valid and not blocked
  if (!isValidGridCoord(start.gx, start.gy, map.gridWidth, map.gridHeight) ||
      !isValidGridCoord(end.gx, end.gy, map.gridWidth, map.gridHeight) ||
      isBlocked(map, start.gx, start.gy) ||
      isBlocked(map, end.gx, end.gy)) {
    return []; // No path possible
  }

  // If start and end are the same, return empty path
  if (start.gx === end.gx && start.gy === end.gy) {
    return [];
  }

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  // Create start node
  const startNode: PathNode = {
    gx: start.gx,
    gy: start.gy,
    gCost: 0,
    hCost: manhattanDistance(start.gx, start.gy, end.gx, end.gy),
    fCost: 0,
    parent: null
  };
  startNode.fCost = startNode.gCost + startNode.hCost;

  openSet.push(startNode);

  while (openSet.length > 0) {
    // Find node with lowest fCost
    let currentIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].fCost < openSet[currentIndex].fCost) {
        currentIndex = i;
      }
    }

    const current = openSet.splice(currentIndex, 1)[0];
    const currentKey = `${current.gx},${current.gy}`;
    closedSet.add(currentKey);

    // Check if we reached the goal
    if (current.gx === end.gx && current.gy === end.gy) {
      // Reconstruct path
      const path: PixelCoordinate[] = [];
      let node: PathNode | null = current;
      
      while (node !== null) {
        const pixel = gridToPixel(node.gx, node.gy, map.meta.tileSize);
        path.unshift(pixel); // Add to beginning
        node = node.parent;
      }
      
      // Remove the first point (current position) if path has more than one point
      if (path.length > 1) {
        path.shift();
      }
      
      return path;
    }

    // Check neighbors
    const neighbors = getNeighbors(current.gx, current.gy, map);
    
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.gx},${neighbor.gy}`;
      
      if (closedSet.has(neighborKey)) {
        continue; // Already processed
      }

      const tentativeGCost = current.gCost + 1; // Distance to neighbor is always 1 in grid

      // Check if this neighbor is already in open set
      let existingNode = openSet.find(node => node.gx === neighbor.gx && node.gy === neighbor.gy);
      
      if (!existingNode) {
        // Create new node
        const newNode: PathNode = {
          gx: neighbor.gx,
          gy: neighbor.gy,
          gCost: tentativeGCost,
          hCost: manhattanDistance(neighbor.gx, neighbor.gy, end.gx, end.gy),
          fCost: 0,
          parent: current
        };
        newNode.fCost = newNode.gCost + newNode.hCost;
        
        openSet.push(newNode);
      } else if (tentativeGCost < existingNode.gCost) {
        // Update existing node with better path
        existingNode.gCost = tentativeGCost;
        existingNode.fCost = existingNode.gCost + existingNode.hCost;
        existingNode.parent = current;
      }
    }
  }

  // No path found
  return [];
}

/**
 * Find the nearest walkable position to a given pixel coordinate
 */
export function findNearestWalkablePosition(
  map: HandMapData,
  px: number,
  py: number,
  maxRadius = 5
): PixelCoordinate | null {
  const center = pixelToGrid(px, py, map.meta.tileSize);
  
  // Check center first
  if (!isBlocked(map, center.gx, center.gy)) {
    return gridToPixel(center.gx, center.gy, map.meta.tileSize);
  }

  // Search in expanding squares
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        // Only check the perimeter of the current radius
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        
        const gx = center.gx + dx;
        const gy = center.gy + dy;
        
        if (isValidGridCoord(gx, gy, map.gridWidth, map.gridHeight) && 
            !isBlocked(map, gx, gy)) {
          return gridToPixel(gx, gy, map.meta.tileSize);
        }
      }
    }
  }

  return null; // No walkable position found within radius
}