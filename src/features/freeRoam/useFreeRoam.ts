import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Officer, WorldState, WarcallKind } from '@sim/types';
import type { GameStore } from '@state/store';
import { generateWorldMap, type WorldMap } from '@/map/generator';
import { findOpenTile, toPercent, type MapCoordinate } from '@/map/navgrid';
import {
  selectActiveOfficers,
  selectActiveWarcalls
} from '@/sim/adapters/freeRoam.selectors';
import type { WarcallWithPhase } from '@state/selectors/warcalls';
import { RNG } from '@sim/rng';

export interface PositionedWarcall {
  warcall: WarcallWithPhase;
  coordinate: MapCoordinate;
  xPercent: number;
  yPercent: number;
}

export interface PositionedOfficer {
  officer: Officer;
  coordinate: MapCoordinate;
  xPercent: number;
  yPercent: number;
  target?: MapCoordinate; // Target position for AI movement
  state: 'idle' | 'moving' | 'fighting' | 'warcall'; // AI state
}

export interface PlayerPosition {
  x: number;
  y: number;
  xPercent: number;
  yPercent: number;
  coordinate: MapCoordinate;
}

interface FreeRoamSnapshot {
  cycle: number;
  warcalls: PositionedWarcall[];
  officers: PositionedOfficer[];
  playerPosition: PlayerPosition;
  dynamicWarcalls: PositionedWarcall[]; // AI-generated warcalls
}

export interface UseFreeRoamOptions {
  mapSize?: number;
  officerLimit?: number;
  idleMs?: number;
}

export interface FreeRoamState extends FreeRoamSnapshot {
  map: WorldMap;
  idleSeconds: number;
  movePlayer: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

export const DEFAULT_IDLE_MS = 60_000;
export const DEFAULT_MAP_SIZE = 512;
export const DEFAULT_OFFICER_LIMIT = 20;

function createInitialPlayerPosition(map: WorldMap): PlayerPosition {
  // Start player in center of map
  const x = Math.floor(map.size / 2);
  const y = Math.floor(map.size / 2);
  const index = y * map.size + x;
  const biome = map.tiles[index] ?? 'plains';

  return {
    x,
    y,
    xPercent: toPercent(map, x),
    yPercent: toPercent(map, y),
    coordinate: { x, y, index, biome }
  };
}

function distance(a: MapCoordinate, b: MapCoordinate): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function moveTowards(
  from: MapCoordinate,
  to: MapCoordinate,
  mapSize: number
): MapCoordinate {
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

  // Clamp to map bounds
  newX = Math.max(0, Math.min(mapSize - 1, newX));
  newY = Math.max(0, Math.min(mapSize - 1, newY));

  const index = newY * mapSize + newX;
  return { x: newX, y: newY, index, biome: from.biome };
}

function generateRandomWarcall(
  rng: RNG,
  map: WorldMap,
  cycle: number,
  occupied: Set<number>
) {
  const warcallTypes: WarcallKind[] = [
    'Hunt',
    'Ambush',
    'Duel',
    'Monsterjagd',
    'Diplomatie'
  ];
  const locations = [
    'North Pass',
    'Dark Woods',
    'Iron Hills',
    'Bone Valley',
    'Stone Bridge'
  ];

  const coordinate = findOpenTile(
    map,
    `random_warcall_${cycle}_${rng.int(0, 999)}`,
    occupied
  );

  return {
    id: `warcall_${cycle}_${rng.int(100, 999999)}`,
    cycleAnnounced: cycle,
    resolveOn: cycle + rng.int(2, 4), // Resolve in 2-4 cycles
    initiator: `npc_${rng.int(1, 100)}`,
    participants: [],
    location: rng.pick(locations),
    baseDifficulty: rng.next(),
    kind: rng.pick(warcallTypes),
    risk: rng.next(),
    rewardHint: 'Mysterious treasure',
    phase: 'prep' as const,
    breakdown: undefined,
    coordinate
  };
}

function computeSnapshot(
  world: WorldState,
  map: WorldMap,
  officerLimit: number,
  playerPosition: PlayerPosition,
  previousOfficers: PositionedOfficer[] = [],
  rng: RNG,
  dynamicWarcalls: PositionedWarcall[] = []
): FreeRoamSnapshot {
  const warcalls = selectActiveWarcalls(world);
  const officers = selectActiveOfficers(world, officerLimit);
  const occupied = new Set<number>();

  const positionedWarcalls: PositionedWarcall[] = warcalls.map((warcall) => {
    const coordinate = findOpenTile(
      map,
      `${warcall.id}:${warcall.location}:${warcall.resolveOn}`,
      occupied
    );
    return {
      warcall,
      coordinate,
      xPercent: toPercent(map, coordinate.x),
      yPercent: toPercent(map, coordinate.y)
    };
  });

  // Generate new dynamic warcalls occasionally
  const updatedDynamicWarcalls = [...dynamicWarcalls];
  if (rng.next() < 0.1 && updatedDynamicWarcalls.length < 3) {
    // 10% chance per update, max 3
    const newWarcall = generateRandomWarcall(rng, map, world.cycle, occupied);
    updatedDynamicWarcalls.push({
      warcall: newWarcall as WarcallWithPhase,
      coordinate: newWarcall.coordinate,
      xPercent: toPercent(map, newWarcall.coordinate.x),
      yPercent: toPercent(map, newWarcall.coordinate.y)
    });
  }

  // Remove expired dynamic warcalls
  const activeDynamicWarcalls = updatedDynamicWarcalls.filter(
    (dw) => dw.warcall.resolveOn > world.cycle
  );

  // All warcalls (official + dynamic)
  const allWarcalls = [...positionedWarcalls, ...activeDynamicWarcalls];

  const positionedOfficers: PositionedOfficer[] = officers.map((officer) => {
    const key = `${officer.stableId ?? officer.id}`;
    const previousOfficer = previousOfficers.find(
      (po) => po.officer.id === officer.id
    );

    let coordinate: MapCoordinate;
    let target: MapCoordinate | undefined;
    let state: 'idle' | 'moving' | 'fighting' | 'warcall' = 'idle';

    if (previousOfficer) {
      // Continue AI behavior
      coordinate = previousOfficer.coordinate;
      target = previousOfficer.target;
      state = previousOfficer.state;

      // AI Logic: Move towards target or find new target
      if (target) {
        const dist = distance(coordinate, target);
        if (dist > 1) {
          coordinate = moveTowards(coordinate, target, map.size);
          state = 'moving';
        } else {
          // Reached target
          target = undefined;
          state = 'idle';
        }
      } else {
        // No target, find one
        if (allWarcalls.length > 0 && rng.next() < 0.3) {
          // 30% chance to move to warcall
          const targetWarcall = rng.pick(allWarcalls);
          target = targetWarcall.coordinate;
          state = 'warcall';
        } else if (rng.next() < 0.1) {
          // 10% chance to move randomly
          target = {
            x: rng.int(0, map.size - 1),
            y: rng.int(0, map.size - 1),
            index: 0,
            biome: 'plains'
          };
          target.index = target.y * map.size + target.x;
          state = 'moving';
        }
      }
    } else {
      // New officer, place randomly
      coordinate = findOpenTile(map, key, occupied);

      // 20% chance to start with a target
      if (allWarcalls.length > 0 && rng.next() < 0.2) {
        target = rng.pick(allWarcalls).coordinate;
        state = 'warcall';
      }
    }

    return {
      officer,
      coordinate,
      xPercent: toPercent(map, coordinate.x),
      yPercent: toPercent(map, coordinate.y),
      target,
      state
    };
  });

  // Check for officer encounters after all officers are positioned
  for (const officer of positionedOfficers) {
    const nearbyOfficers = positionedOfficers.filter(
      (other) =>
        other.officer.id !== officer.officer.id &&
        distance(officer.coordinate, other.coordinate) <= 2
    );

    if (nearbyOfficers.length > 0 && rng.next() < 0.05) {
      // 5% chance to fight
      officer.state = 'fighting';
      officer.target = undefined;
    }
  }

  return {
    cycle: world.cycle,
    warcalls: positionedWarcalls,
    officers: positionedOfficers,
    playerPosition,
    dynamicWarcalls: activeDynamicWarcalls
  };
}

export function useFreeRoam(
  store: GameStore,
  options: UseFreeRoamOptions = {}
): FreeRoamState {
  const mapSize = options.mapSize ?? DEFAULT_MAP_SIZE;
  const officerLimit = options.officerLimit ?? DEFAULT_OFFICER_LIMIT;
  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS;

  const map = useMemo(() => {
    const initial = store.getState();
    return generateWorldMap(initial.seed, mapSize);
  }, [store, mapSize]);

  const rng = useMemo(() => {
    const initial = store.getState();
    return new RNG(`${initial.seed}:freeRoam:ai`);
  }, [store]);

  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>(() =>
    createInitialPlayerPosition(map)
  );

  const [dynamicWarcalls, setDynamicWarcalls] = useState<PositionedWarcall[]>(
    []
  );
  const [previousOfficers, setPreviousOfficers] = useState<PositionedOfficer[]>(
    []
  );

  const [snapshot, setSnapshot] = useState<FreeRoamSnapshot>(() =>
    computeSnapshot(
      store.getState(),
      map,
      officerLimit,
      playerPosition,
      [],
      rng,
      []
    )
  );
  const [idleSeconds, setIdleSeconds] = useState(0);
  const lastInteractionRef = useRef(Date.now());
  const aiUpdateIntervalRef = useRef<number | null>(null);

  const movePlayer = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      setPlayerPosition((prev) => {
        let newX = prev.x;
        let newY = prev.y;

        switch (direction) {
          case 'up':
            newY = Math.max(0, prev.y - 1);
            break;
          case 'down':
            newY = Math.min(map.size - 1, prev.y + 1);
            break;
          case 'left':
            newX = Math.max(0, prev.x - 1);
            break;
          case 'right':
            newX = Math.min(map.size - 1, prev.x + 1);
            break;
        }

        // Don't move if position unchanged
        if (newX === prev.x && newY === prev.y) {
          return prev;
        }

        const index = newY * map.size + newX;
        const biome = map.tiles[index] ?? 'plains';

        return {
          x: newX,
          y: newY,
          xPercent: toPercent(map, newX),
          yPercent: toPercent(map, newY),
          coordinate: { x: newX, y: newY, index, biome }
        };
      });
    },
    [map]
  );

  // Update AI every 2 seconds
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    aiUpdateIntervalRef.current = window.setInterval(() => {
      const newSnapshot = computeSnapshot(
        store.getState(),
        map,
        officerLimit,
        playerPosition,
        previousOfficers,
        rng,
        dynamicWarcalls
      );
      setSnapshot(newSnapshot);
      setPreviousOfficers(newSnapshot.officers);
      setDynamicWarcalls(newSnapshot.dynamicWarcalls);
    }, 2000); // Update AI every 2 seconds

    return () => {
      if (aiUpdateIntervalRef.current) {
        window.clearInterval(aiUpdateIntervalRef.current);
      }
    };
  }, [
    store,
    map,
    officerLimit,
    playerPosition,
    previousOfficers,
    rng,
    dynamicWarcalls
  ]);

  useEffect(() => {
    const newSnapshot = computeSnapshot(
      store.getState(),
      map,
      officerLimit,
      playerPosition,
      previousOfficers,
      rng,
      dynamicWarcalls
    );
    setSnapshot(newSnapshot);
  }, [
    store,
    map,
    officerLimit,
    playerPosition,
    previousOfficers,
    rng,
    dynamicWarcalls
  ]);

  useEffect(() => {
    const unsubscribe = store.events.on('state:changed', (world) => {
      const newSnapshot = computeSnapshot(
        world,
        map,
        officerLimit,
        playerPosition,
        previousOfficers,
        rng,
        dynamicWarcalls
      );
      setSnapshot(newSnapshot);
      setPreviousOfficers(newSnapshot.officers);
      setDynamicWarcalls(newSnapshot.dynamicWarcalls);
    });
    return () => unsubscribe();
  }, [
    map,
    officerLimit,
    playerPosition,
    previousOfficers,
    rng,
    dynamicWarcalls
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const markInteraction = () => {
      lastInteractionRef.current = Date.now();
      setIdleSeconds(0);
    };
    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'pointermove',
      'keydown',
      'wheel',
      'touchstart'
    ];
    events.forEach((event) =>
      window.addEventListener(event, markInteraction, { passive: true })
    );
    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, markInteraction)
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastInteractionRef.current;
      const seconds = Math.floor(elapsed / 1000);
      setIdleSeconds(seconds);
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
    idleSeconds,
    movePlayer,
    ...snapshot
  };
}
