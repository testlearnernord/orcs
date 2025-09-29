/**
 * Free-Roam hook for handcrafted maps
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { WorldState, WarcallKind } from '@sim/types';
import type { GameStore } from '@state/store';
import { RNG } from '@sim/rng';
import type { HandMapData } from './hmap/types';
import { loadHandMap } from './hmap/loader';
import { findPath, findNearestWalkablePosition } from './hmap/pathfinding';
import {
  selectActiveOfficers,
  selectActiveWarcalls
} from '@/sim/adapters/freeRoam.selectors';

export interface PositionedWarcall {
  id: string;
  x: number;
  y: number;
  kind: WarcallKind;
  risk: number;
  rewardHint: string;
  phase: 'prep' | 'travel' | 'event' | 'resolution';
  breakdown?: any;
}

export interface PositionedOfficer {
  id: string;
  name: string;
  x: number;
  y: number;
  state: 'idle' | 'moving';
  target?: { x: number; y: number } | undefined;
}

export interface PlayerPosition {
  x: number;
  y: number;
}

interface HandcraftedFreeRoamSnapshot {
  cycle: number;
  officers: PositionedOfficer[];
  warcalls: PositionedWarcall[];
}

export interface UseHandcraftedFreeRoamOptions {
  officerLimit?: number;
  idleMs?: number;
}

export interface HandcraftedFreeRoamState extends HandcraftedFreeRoamSnapshot {
  map: HandMapData | null;
  idleSeconds: number;
  loading: boolean;
  error: string | null;
  playerPosition: PlayerPosition;
  moveTo: (x: number, y: number) => void;
  movePlayerDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  resetCamera: () => { x: number; y: number; scale: number };
  nearbyInteractions: Array<{
    type: 'officer' | 'warcall';
    id: string;
    name: string;
    distance: number;
    data: PositionedOfficer | PositionedWarcall;
  }>;
}

export const DEFAULT_IDLE_MS = 60_000;
export const DEFAULT_OFFICER_LIMIT = 20;

function createInitialPlayerPosition(map: HandMapData): PlayerPosition {
  return {
    x: map.meta.spawns.player.x,
    y: map.meta.spawns.player.y
  };
}

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function moveTowards(
  from: { x: number; y: number },
  to: { x: number; y: number },
  map: HandMapData
): { x: number; y: number } {
  const path = findPath(map, from.x, from.y, to.x, to.y);
  if (path.length > 0) {
    return { x: path[0].px, y: path[0].py };
  }
  return from; // No path found, stay in place
}

function computeSnapshot(
  world: WorldState,
  map: HandMapData,
  officerLimit: number,
  playerPosition: PlayerPosition,
  previousOfficers: PositionedOfficer[] = [],
  rng: RNG
): HandcraftedFreeRoamSnapshot {
  const officers = selectActiveOfficers(world);
  const warcalls = selectActiveWarcalls(world);
  const occupied = new Set<string>();

  // Mark player position as occupied
  occupied.add(`${playerPosition.x},${playerPosition.y}`);

  // Position officers
  const positionedOfficers: PositionedOfficer[] = [];

  for (let i = 0; i < Math.min(officers.length, officerLimit); i++) {
    const officer = officers[i];
    const previousOfficer = previousOfficers.find((o) => o.id === officer.id);

    let x: number, y: number;
    let state: 'idle' | 'moving' = 'idle';
    let target: { x: number; y: number } | undefined;

    if (previousOfficer) {
      // Continue from previous position
      x = previousOfficer.x;
      y = previousOfficer.y;
      target = previousOfficer.target;
      state = previousOfficer.state;

      // AI Logic: Move towards target or find new target
      if (target) {
        const dist = distance({ x, y }, target);
        if (dist > map.meta.tileSize) {
          const newPos = moveTowards({ x, y }, target, map);
          x = newPos.x;
          y = newPos.y;
          state = 'moving';
        } else {
          // Reached target
          target = undefined;
          state = 'idle';
        }
      } else {
        // No target, find one occasionally
        if (rng.next() < 0.1) {
          // 10% chance to move
          // Try to move to a random POI or spawn point
          const targets = [
            ...map.meta.pois.map((poi) => ({ x: poi.x, y: poi.y })),
            ...map.meta.spawns.officers
          ];
          if (targets.length > 0) {
            target = rng.pick(targets);
            state = 'idle'; // Will start moving next cycle
          }
        }
      }
    } else {
      // New officer, spawn at one of the designated spawn points
      const spawnPoints = map.meta.spawns.officers;
      if (spawnPoints.length === 0) {
        // Fallback to near player spawn
        x = map.meta.spawns.player.x + rng.int(-100, 100);
        y = map.meta.spawns.player.y + rng.int(-100, 100);
      } else {
        const spawn = rng.pick(spawnPoints);
        x = spawn.x;
        y = spawn.y;
      }

      // Snap to walkable position if needed
      const walkable = findNearestWalkablePosition(map, x, y);
      if (walkable) {
        x = walkable.px;
        y = walkable.py;
      }
    }

    const posKey = `${Math.round(x)},${Math.round(y)}`;
    occupied.add(posKey);

    positionedOfficers.push({
      id: officer.id,
      name: officer.name,
      x,
      y,
      state,
      target
    });
  }

  // Position warcalls
  const positionedWarcalls: PositionedWarcall[] = [];

  for (const warcall of warcalls) {
    // Try to place at a POI first, then random location
    let x: number, y: number;
    const poi = map.meta.pois[positionedWarcalls.length % map.meta.pois.length];
    if (poi) {
      x = poi.x + rng.int(-50, 50);
      y = poi.y + rng.int(-50, 50);
    } else {
      x = rng.int(100, map.meta.pixelSize.width - 100);
      y = rng.int(100, map.meta.pixelSize.height - 100);
    }

    // Snap to walkable position
    const walkable = findNearestWalkablePosition(map, x, y);
    if (walkable) {
      x = walkable.px;
      y = walkable.py;
    }

    positionedWarcalls.push({
      id: warcall.id,
      x,
      y,
      kind: warcall.kind,
      risk: warcall.risk,
      rewardHint: warcall.rewardHint ?? 'Mysterious treasure',
      phase: warcall.phase,
      breakdown: warcall.breakdown
    });
  }

  return {
    cycle: world.cycle,
    officers: positionedOfficers,
    warcalls: positionedWarcalls
  };
}

export function useHandcraftedFreeRoam(
  store: GameStore,
  mapId: string,
  options: UseHandcraftedFreeRoamOptions = {}
): HandcraftedFreeRoamState {
  const officerLimit = options.officerLimit ?? DEFAULT_OFFICER_LIMIT;
  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS;

  const [map, setMap] = useState<HandMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rng = useMemo(() => {
    const initial = store.getState();
    return new RNG(`${initial.seed}:freeRoam:hmap:${mapId}`);
  }, [store, mapId]);

  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>(() => ({
    x: 983, // Default from meta.json
    y: 768
  }));

  const [previousOfficers, setPreviousOfficers] = useState<PositionedOfficer[]>(
    []
  );

  const [snapshot, setSnapshot] = useState<HandcraftedFreeRoamSnapshot>(() => ({
    cycle: 0,
    officers: [],
    warcalls: []
  }));

  const [idleSeconds, setIdleSeconds] = useState(0);
  const lastInteractionRef = useRef(Date.now());

  // Use refs to avoid dependency loops
  const playerPositionRef = useRef(playerPosition);
  const previousOfficersRef = useRef(previousOfficers);

  // Update refs when state changes
  useEffect(() => {
    playerPositionRef.current = playerPosition;
  }, [playerPosition]);

  useEffect(() => {
    previousOfficersRef.current = previousOfficers;
  }, [previousOfficers]);

  // Compute nearby interactions based on player position
  const nearbyInteractions = useMemo(() => {
    if (!map) return [];
    
    const INTERACTION_DISTANCE = 60; // Pixels
    const interactions: Array<{
      type: 'officer' | 'warcall';
      id: string;
      name: string;
      distance: number;
      data: PositionedOfficer | PositionedWarcall;
    }> = [];
    
    const playerPos = playerPositionRef.current;
    
    // Check officers
    for (const officer of snapshot.officers) {
      const dist = distance(playerPos, { x: officer.x, y: officer.y });
      if (dist <= INTERACTION_DISTANCE) {
        interactions.push({
          type: 'officer',
          id: officer.id,
          name: officer.name,
          distance: dist,
          data: officer
        });
      }
    }
    
    // Check warcalls
    for (const warcall of snapshot.warcalls) {
      const dist = distance(playerPos, { x: warcall.x, y: warcall.y });
      if (dist <= INTERACTION_DISTANCE) {
        interactions.push({
          type: 'warcall',
          id: warcall.id,
          name: `${warcall.kind} - ${warcall.rewardHint}`,
          distance: dist,
          data: warcall
        });
      }
    }
    
    return interactions.sort((a, b) => a.distance - b.distance);
  }, [map, snapshot.officers, snapshot.warcalls, playerPosition]);

  // Load map
  useEffect(() => {
    let cancelled = false;

    async function loadMap() {
      try {
        setLoading(true);
        setError(null);
        const loadedMap = await loadHandMap(mapId);

        if (!cancelled) {
          setMap(loadedMap);
          setPlayerPosition(createInitialPlayerPosition(loadedMap));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMap();

    return () => {
      cancelled = true;
    };
  }, [mapId]);

  // Update snapshot when map loads or world changes
  useEffect(() => {
    if (!map) return;

    const unsubscribe = store.events.on('state:changed', (world) => {
      const newSnapshot = computeSnapshot(
        world,
        map,
        officerLimit,
        playerPositionRef.current,
        previousOfficersRef.current,
        rng
      );
      setSnapshot(newSnapshot);
      setPreviousOfficers(newSnapshot.officers);
    });

    // Initial snapshot
    const world = store.getState();
    const initialSnapshot = computeSnapshot(
      world,
      map,
      officerLimit,
      playerPositionRef.current,
      previousOfficersRef.current,
      rng
    );
    setSnapshot(initialSnapshot);
    setPreviousOfficers(initialSnapshot.officers);

    return () => unsubscribe();
  }, [map, store, officerLimit, playerPosition, rng]);

  const moveTo = useCallback(
    (x: number, y: number) => {
      if (!map) return;

      const walkable = findNearestWalkablePosition(map, x, y);
      if (walkable) {
        setPlayerPosition({ x: walkable.px, y: walkable.py });
        lastInteractionRef.current = Date.now();
        setIdleSeconds(0);
        
        // Trigger cycle advancement when player moves significantly
        const currentPos = playerPositionRef.current;
        const moveDistance = Math.sqrt(
          (walkable.px - currentPos.x) ** 2 + (walkable.py - currentPos.y) ** 2
        );
        
        // If moving more than 50 pixels, consider advancing cycle
        if (moveDistance > 50) {
          store.tick();
        }
      }
    },
    [map, store]
  );

  const movePlayerDirection = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (!map) return;

      const stepSize = 20; // Pixels to move per step
      const currentPos = playerPositionRef.current;
      let newX = currentPos.x;
      let newY = currentPos.y;

      switch (direction) {
        case 'up':
          newY -= stepSize;
          break;
        case 'down':
          newY += stepSize;
          break;
        case 'left':
          newX -= stepSize;
          break;
        case 'right':
          newX += stepSize;
          break;
      }

      // Check collision and find nearest walkable position
      const walkable = findNearestWalkablePosition(map, newX, newY, 3);
      if (walkable && 
          (walkable.px !== currentPos.x || walkable.py !== currentPos.y)) {
        setPlayerPosition({ x: walkable.px, y: walkable.py });
        lastInteractionRef.current = Date.now();
        setIdleSeconds(0);
        
        // Auto-advance cycle occasionally when moving with WASD
        if (Math.random() < 0.05) { // 5% chance per move
          store.tick();
        }
      }
    },
    [map, store]
  );

  const resetCamera = useCallback(() => {
    if (!map) return { x: 0, y: 0, scale: 1 };

    return {
      x: map.meta.spawns.player.x,
      y: map.meta.spawns.player.y,
      scale: map.meta.camera.startZoom
    };
  }, [map]);

  // Officer movement simulation timer
  useEffect(() => {
    if (!map || typeof window === 'undefined') return undefined;
    
    const interval = window.setInterval(() => {
      // Update officer positions every 2 seconds
      const currentOfficers = previousOfficersRef.current;
      const updatedOfficers = currentOfficers.map(officer => {
        // AI Logic: Move towards target or find new target
        let { x, y, target, state } = officer;
        
        if (target) {
          const dist = distance({ x, y }, target);
          if (dist > map.meta.tileSize / 2) { // More sensitive movement
            const newPos = moveTowards({ x, y }, target, map);
            x = newPos.x;
            y = newPos.y;
            state = 'moving';
          } else {
            // Reached target
            target = undefined;
            state = 'idle';
          }
        } else {
          // No target, find one occasionally
          if (rng.next() < 0.15) { // Increased chance to move
            // Try to move to a random POI or spawn point
            const targets = [
              ...map.meta.pois.map((poi) => ({ x: poi.x, y: poi.y })),
              ...map.meta.spawns.officers
            ];
            if (targets.length > 0) {
              target = rng.pick(targets);
              state = 'idle'; // Will start moving next update
            }
          }
        }
        
        return { ...officer, x, y, target, state };
      });
      
      // Only update if officers actually moved
      const hasMovement = updatedOfficers.some((officer, index) => 
        officer.x !== currentOfficers[index]?.x || 
        officer.y !== currentOfficers[index]?.y ||
        officer.state !== currentOfficers[index]?.state
      );
      
      if (hasMovement) {
        setPreviousOfficers(updatedOfficers);
        setSnapshot(prev => ({ ...prev, officers: updatedOfficers }));
      }
    }, 2000); // Update every 2 seconds
    
    return () => window.clearInterval(interval);
  }, [map, rng]);

  // Idle timer
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastInteractionRef.current;
      const newIdleSeconds = Math.floor(elapsed / 1000);
      setIdleSeconds(newIdleSeconds);

      // Auto-advance cycle if idle too long
      if (elapsed >= idleMs) {
        lastInteractionRef.current = now;
        setIdleSeconds(0);
        store.tick();
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [store, idleMs]);

  return {
    map,
    loading,
    error,
    idleSeconds,
    moveTo,
    movePlayerDirection,
    resetCamera,
    playerPosition,
    nearbyInteractions,
    ...snapshot
  };
}
