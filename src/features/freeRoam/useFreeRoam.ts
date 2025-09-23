import { useEffect, useMemo, useRef, useState } from 'react';
import type { Officer, WorldState } from '@sim/types';
import type { GameStore } from '@state/store';
import { generateWorldMap, type WorldMap } from '@/map/generator';
import { findOpenTile, toPercent, type MapCoordinate } from '@/map/navgrid';
import {
  selectActiveOfficers,
  selectActiveWarcalls
} from '@/sim/adapters/freeRoam.selectors';
import type { WarcallWithPhase } from '@state/selectors/warcalls';

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
}

interface FreeRoamSnapshot {
  cycle: number;
  warcalls: PositionedWarcall[];
  officers: PositionedOfficer[];
}

export interface UseFreeRoamOptions {
  mapSize?: number;
  officerLimit?: number;
  idleMs?: number;
}

export interface FreeRoamState extends FreeRoamSnapshot {
  map: WorldMap;
  idleSeconds: number;
}

export const DEFAULT_IDLE_MS = 60_000;
export const DEFAULT_MAP_SIZE = 256;
export const DEFAULT_OFFICER_LIMIT = 20;

function computeSnapshot(
  world: WorldState,
  map: WorldMap,
  officerLimit: number
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

  const positionedOfficers: PositionedOfficer[] = officers.map((officer) => {
    const key = `${officer.stableId ?? officer.id}`;
    const coordinate = findOpenTile(map, key, occupied);
    return {
      officer,
      coordinate,
      xPercent: toPercent(map, coordinate.x),
      yPercent: toPercent(map, coordinate.y)
    };
  });

  return {
    cycle: world.cycle,
    warcalls: positionedWarcalls,
    officers: positionedOfficers
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

  const [snapshot, setSnapshot] = useState<FreeRoamSnapshot>(() =>
    computeSnapshot(store.getState(), map, officerLimit)
  );
  const [idleSeconds, setIdleSeconds] = useState(0);
  const lastInteractionRef = useRef(Date.now());

  useEffect(() => {
    setSnapshot(computeSnapshot(store.getState(), map, officerLimit));
  }, [store, map, officerLimit]);

  useEffect(() => {
    const unsubscribe = store.events.on('state:changed', (world) => {
      setSnapshot(computeSnapshot(world, map, officerLimit));
    });
    return () => unsubscribe();
  }, [store, map, officerLimit]);

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
    ...snapshot
  };
}
