/**
 * Free-Roam hook for Somaia world map
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Officer, WorldState } from '@sim/types';
import type { GameStore } from '@state/store';
import { RNG } from '@sim/rng';
import {
  selectActiveOfficers,
  selectActiveWarcalls
} from '@/sim/adapters/freeRoam.selectors';
import type { WarcallWithPhase } from '@state/selectors/warcalls';

export interface SomaiaMapData {
  name: string;
  version: string;
  type: string;
  pixelSize: { width: number; height: number };
  tileSize: number;
  camera: {
    minZoom: number;
    maxZoom: number;
    startZoom: number;
  };
  countries: Array<{
    id: string;
    name: string;
    displayName: string;
    description: string;
    region: { x: number; y: number; width: number; height: number };
    active: boolean;
    color: string;
  }>;
  spawns: {
    player: { x: number; y: number };
    officers: Array<{ x: number; y: number }>;
  };
  biomes: {
    [key: string]: {
      regions: Array<{ x: number; y: number; width: number; height: number }>;
      blocked: boolean;
    };
  };
  pois: Array<{
    id: string;
    x: number;
    y: number;
    label: string;
  }>;
}

export interface PositionedWarcall {
  warcall: WarcallWithPhase;
  x: number;
  y: number;
}

export interface PositionedOfficer {
  officer: Officer;
  x: number;
  y: number;
  target?: { x: number; y: number };
  state: 'idle' | 'moving' | 'fighting' | 'warcall';
}

export interface PlayerPosition {
  x: number;
  y: number;
}

interface SomaiaFreeRoamSnapshot {
  cycle: number;
  officers: PositionedOfficer[];
  warcalls: PositionedWarcall[];
}

export interface UseSomaiaFreeRoamOptions {
  officerLimit?: number;
  idleMs?: number;
}

export interface SomaiaFreeRoamState extends SomaiaFreeRoamSnapshot {
  map: SomaiaMapData | null;
  idleSeconds: number;
  loading: boolean;
  error: string | null;
  playerPosition: PlayerPosition;
  currentCountry: string;
  movePlayer: (direction: 'up' | 'down' | 'left' | 'right') => void;
  movePlayerTo: (x: number, y: number) => void;
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

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isPositionBlocked(map: SomaiaMapData, x: number, y: number): boolean {
  // Check if position is in any blocked biome
  for (const [biomeName, biome] of Object.entries(map.biomes)) {
    if (biome.blocked) {
      for (const region of biome.regions) {
        if (
          x >= region.x &&
          x <= region.x + region.width &&
          y >= region.y &&
          y <= region.y + region.height
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function moveTowards(
  from: { x: number; y: number },
  to: { x: number; y: number },
  map: SomaiaMapData
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Simple pathfinding - move one step towards target
  let newX = from.x;
  let newY = from.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    newX = from.x + (dx > 0 ? 1 : -1);
  } else if (dy !== 0) {
    newY = from.y + (dy > 0 ? 1 : -1);
  }

  // Check collision
  if (isPositionBlocked(map, newX, newY)) {
    return from; // Can't move to blocked position
  }

  return { x: newX, y: newY };
}

function getCurrentCountry(
  map: SomaiaMapData,
  position: PlayerPosition
): string {
  for (const country of map.countries) {
    const region = country.region;
    if (
      position.x >= region.x &&
      position.x <= region.x + region.width &&
      position.y >= region.y &&
      position.y <= region.y + region.height
    ) {
      return country.id;
    }
  }
  return 'unknown';
}

async function loadSomaiaMap(): Promise<SomaiaMapData> {
  const response = await fetch('/assets/maps/somaia/meta.json');
  if (!response.ok) {
    throw new Error(`Failed to load Somaia map: ${response.statusText}`);
  }
  return response.json();
}

export function useSomaiaFreeRoam(
  store: GameStore,
  options: UseSomaiaFreeRoamOptions = {}
): SomaiaFreeRoamState {
  const officerLimit = options.officerLimit ?? DEFAULT_OFFICER_LIMIT;
  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS;

  const [map, setMap] = useState<SomaiaMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idleSeconds, setIdleSeconds] = useState(0);

  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>({
    x: 250,
    y: 350 // Default to Grum'thak capital
  });

  const [snapshot, setSnapshot] = useState<SomaiaFreeRoamSnapshot>({
    cycle: 0,
    officers: [],
    warcalls: []
  });

  // Load map data
  useEffect(() => {
    loadSomaiaMap()
      .then((mapData) => {
        setMap(mapData);
        setPlayerPosition({
          x: mapData.spawns.player.x,
          y: mapData.spawns.player.y
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load Somaia map:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const movePlayer = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (!map) return;

      setPlayerPosition((prev) => {
        let newX = prev.x;
        let newY = prev.y;
        const step = 5; // Movement step size

        switch (direction) {
          case 'up':
            newY = Math.max(0, prev.y - step);
            break;
          case 'down':
            newY = Math.min(map.pixelSize.height, prev.y + step);
            break;
          case 'left':
            newX = Math.max(0, prev.x - step);
            break;
          case 'right':
            newX = Math.min(map.pixelSize.width, prev.x + step);
            break;
        }

        // Check collision
        if (isPositionBlocked(map, newX, newY)) {
          return prev; // Can't move to blocked position
        }

        // Auto-advance cycle occasionally when moving (5% chance)
        if (Math.random() < 0.05) {
          store.tick();
        }

        return { x: newX, y: newY };
      });
    },
    [map, store]
  );

  const movePlayerTo = useCallback(
    (x: number, y: number) => {
      if (!map) return;
      if (isPositionBlocked(map, x, y)) return;

      setPlayerPosition({ x, y });
    },
    [map]
  );

  const resetCamera = useCallback(() => {
    if (!map) return { x: 0, y: 0, scale: 1 };

    // Focus on Grum'thak region
    const grumthak = map.countries.find((c) => c.id === 'grumthak');
    if (grumthak) {
      return {
        x: grumthak.region.x + grumthak.region.width / 2,
        y: grumthak.region.y + grumthak.region.height / 2,
        scale: map.camera.startZoom
      };
    }

    return { x: 0, y: 0, scale: map.camera.startZoom };
  }, [map]);

  const currentCountry = useMemo(() => {
    if (!map) return 'unknown';
    return getCurrentCountry(map, playerPosition);
  }, [map, playerPosition]);

  // Compute nearby interactions
  const nearbyInteractions = useMemo(() => {
    const INTERACTION_DISTANCE = 80; // Pixels
    const interactions: Array<{
      type: 'officer' | 'warcall';
      id: string;
      name: string;
      distance: number;
      data: PositionedOfficer | PositionedWarcall;
    }> = [];

    // Check officers
    for (const officerEntry of snapshot.officers) {
      const dist = distance(playerPosition, {
        x: officerEntry.x,
        y: officerEntry.y
      });
      if (dist <= INTERACTION_DISTANCE) {
        interactions.push({
          type: 'officer',
          id: officerEntry.officer.id,
          name: officerEntry.officer.name,
          distance: dist,
          data: officerEntry
        });
      }
    }

    // Check warcalls
    for (const warcallEntry of snapshot.warcalls) {
      const dist = distance(playerPosition, {
        x: warcallEntry.x,
        y: warcallEntry.y
      });
      if (dist <= INTERACTION_DISTANCE) {
        interactions.push({
          type: 'warcall',
          id: warcallEntry.warcall.id,
          name: `${warcallEntry.warcall.kind}`,
          distance: dist,
          data: warcallEntry
        });
      }
    }

    return interactions.sort((a, b) => a.distance - b.distance);
  }, [playerPosition, snapshot.officers, snapshot.warcalls]);

  // Update snapshot when world state changes
  useEffect(() => {
    const world = store.getState();
    const activeOfficers = selectActiveOfficers(world).slice(0, officerLimit);
    const activeWarcalls = selectActiveWarcalls(world);

    if (!map) return;

    // Position officers in Grum'thak region only
    const grumthak = map.countries.find((c) => c.id === 'grumthak');
    if (!grumthak) return;

    const positionedOfficers: PositionedOfficer[] = activeOfficers.map(
      (officer, index) => {
        const spawn = map.spawns.officers[index % map.spawns.officers.length];
        return {
          officer,
          x: spawn.x,
          y: spawn.y,
          state: 'idle'
        };
      }
    );

    const positionedWarcalls: PositionedWarcall[] = activeWarcalls.map(
      (warcall, index) => {
        // Place warcalls in random positions within Grum'thak
        const x = grumthak.region.x + Math.random() * grumthak.region.width;
        const y = grumthak.region.y + Math.random() * grumthak.region.height;
        return {
          warcall,
          x,
          y
        };
      }
    );

    setSnapshot({
      cycle: world.cycle,
      officers: positionedOfficers,
      warcalls: positionedWarcalls
    });
  }, [store, map, officerLimit]);

  return {
    map,
    loading,
    error,
    idleSeconds,
    playerPosition,
    currentCountry,
    movePlayer,
    movePlayerTo,
    resetCamera,
    nearbyInteractions,
    ...snapshot
  };
}
