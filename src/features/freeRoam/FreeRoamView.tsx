import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameStore } from '@state/store';
import type { Phase } from '@state/selectors/warcalls';
import Portrait from '@/ui/Portrait';
import { renderWorldMap } from '@/map/render';
import type { Biome } from '@/map/generator';
import {
  DEFAULT_IDLE_MS,
  DEFAULT_OFFICER_LIMIT,
  DEFAULT_MAP_SIZE,
  useFreeRoam
} from './useFreeRoam';

const PHASE_LABEL: Record<Phase, string> = {
  prep: 'Vorbereitung',
  travel: 'Auf dem Weg',
  event: 'Ereignis',
  resolution: 'Auflösung'
};

const BIOME_LABEL: Record<Biome, string> = {
  desert: 'Wüste',
  plains: 'Ebene',
  forest: 'Wald',
  swamp: 'Sumpf',
  tundra: 'Tundra',
  ashwastes: 'Aschelande',
  volcano: 'Vulkan',
  river: 'Fluss'
};

interface FreeRoamViewProps {
  store: GameStore;
  onRequestClose: () => void;
  onHighlightHostChange?: (element: HTMLElement | null) => void;
}

interface CameraState {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.75;
const KEYBOARD_MOVE_SPEED = 420;

const MOVE_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright'
]);

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function formatIdleCountdown(idleMs: number, idleSeconds: number): number {
  const totalSeconds = Math.ceil(idleMs / 1000);
  return Math.max(0, totalSeconds - idleSeconds);
}

export function FreeRoamView({
  store,
  onRequestClose,
  onHighlightHostChange
}: FreeRoamViewProps) {
  const idleMs = DEFAULT_IDLE_MS;
  const { map, warcalls, officers, cycle, idleSeconds } = useFreeRoam(store, {
    mapSize: DEFAULT_MAP_SIZE,
    officerLimit: DEFAULT_OFFICER_LIMIT,
    idleMs
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const highlightHostRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const pointerState = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    isDragging: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    isDragging: false
  });
  const [camera, setCamera] = useState<CameraState>({ scale: 1, x: 0, y: 0 });
  const keysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderWorldMap(canvas, map);
  }, [map]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!onHighlightHostChange) return undefined;
    const host = highlightHostRef.current;
    onHighlightHostChange(host);
    return () => {
      onHighlightHostChange(null);
    };
  }, [onHighlightHostChange]);

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onRequestClose]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!MOVE_KEYS.has(key)) {
        return;
      }
      keysRef.current.add(key);
      if (key.startsWith('arrow')) {
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!MOVE_KEYS.has(key)) {
        return;
      }
      keysRef.current.delete(key);
      if (key.startsWith('arrow')) {
        event.preventDefault();
      }
    };

    let animationFrame: number | null = null;
    let lastTimestamp = performance.now();

    const step = (timestamp: number) => {
      const elapsed = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      const keys = keysRef.current;
      let horizontal = 0;
      let vertical = 0;
      if (keys.has('a') || keys.has('arrowleft')) horizontal -= 1;
      if (keys.has('d') || keys.has('arrowright')) horizontal += 1;
      if (keys.has('w') || keys.has('arrowup')) vertical -= 1;
      if (keys.has('s') || keys.has('arrowdown')) vertical += 1;

      if (horizontal !== 0 || vertical !== 0) {
        const length = Math.hypot(horizontal, vertical) || 1;
        const velocity = KEYBOARD_MOVE_SPEED * elapsed;
        const deltaX = (horizontal / length) * velocity;
        const deltaY = (vertical / length) * velocity;
        setCamera((prev) => {
          const nextX = prev.x + deltaX;
          const nextY = prev.y + deltaY;
          if (nextX === prev.x && nextY === prev.y) {
            return prev;
          }
          return { ...prev, x: nextX, y: nextY };
        });
      }

      animationFrame = window.requestAnimationFrame(step);
    };

    animationFrame = window.requestAnimationFrame((timestamp) => {
      lastTimestamp = timestamp;
      step(timestamp);
    });

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      keysRef.current.clear();
    };
  }, []);

  const secondsUntilCycle = useMemo(
    () => formatIdleCountdown(idleMs, idleSeconds),
    [idleMs, idleSeconds]
  );

  const handleAdvanceCycle = useCallback(() => {
    store.tick();
  }, [store]);

  const handleResetCamera = useCallback(() => {
    setCamera({ scale: 1, x: 0, y: 0 });
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const stage = stageRef.current;
      if (!stage) return;
      stage.setPointerCapture(event.pointerId);
      pointerState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: camera.x,
        originY: camera.y,
        isDragging: true
      };
    },
    [camera]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = pointerState.current;
      if (!state.isDragging || state.pointerId !== event.pointerId) {
        return;
      }
      const deltaX = event.clientX - state.startX;
      const deltaY = event.clientY - state.startY;
      setCamera((prev) => {
        if (!state.isDragging) return prev;
        const nextX = state.originX + deltaX;
        const nextY = state.originY + deltaY;
        if (prev.x === nextX && prev.y === nextY) {
          return prev;
        }
        return { ...prev, x: nextX, y: nextY };
      });
    },
    []
  );

  const stopDragging = useCallback(() => {
    const state = pointerState.current;
    if (!state.isDragging) return;
    pointerState.current = {
      pointerId: null,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0,
      isDragging: false
    };
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const stage = stageRef.current;
      if (stage && stage.hasPointerCapture(event.pointerId)) {
        stage.releasePointerCapture(event.pointerId);
      }
      stopDragging();
    },
    [stopDragging]
  );

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    event.preventDefault();
    const scaleFactor = event.deltaY < 0 ? 1.12 : 0.88;
    setCamera((prev) => {
      const nextScale = clamp(prev.scale * scaleFactor, MIN_SCALE, MAX_SCALE);
      if (nextScale === prev.scale) {
        return prev;
      }
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) {
        return { ...prev, scale: nextScale };
      }
      const offsetX = event.clientX - rect.left - rect.width / 2;
      const offsetY = event.clientY - rect.top - rect.height / 2;
      const scaleDelta = nextScale / prev.scale;
      const nextX = prev.x - offsetX * (scaleDelta - 1);
      const nextY = prev.y - offsetY * (scaleDelta - 1);
      if (nextX === prev.x && nextY === prev.y && nextScale === prev.scale) {
        return prev;
      }
      return { scale: nextScale, x: nextX, y: nextY };
    });
  }, []);

  const handleBackdropClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      onRequestClose();
    },
    [onRequestClose]
  );

  const secondsLabel = useMemo(
    () => `${secondsUntilCycle}s`,
    [secondsUntilCycle]
  );

  const viewportStyle = useMemo(
    () => ({
      transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
      transformOrigin: 'center center'
    }),
    [camera]
  );

  return (
    <div
      className="free-roam"
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-roam-title"
      onClick={handleBackdropClick}
    >
      <header className="free-roam__hud">
        <div className="free-roam__title">
          <h1 id="free-roam-title">Free Roam (Test)</h1>
          <p>Erkunde die Nemesis-Simulation direkt auf der Weltkarte.</p>
        </div>
        <div className="free-roam__status">
          <span>Zyklus {cycle}</span>
          <span>Nächster Auto-Cycle in {secondsLabel}</span>
        </div>
        <div className="free-roam__actions">
          <button type="button" onClick={handleAdvanceCycle}>
            Cycle auslösen
          </button>
          <button type="button" onClick={handleResetCamera}>
            Kamera zurücksetzen
          </button>
          <button type="button" onClick={onRequestClose} ref={closeButtonRef}>
            Zurück
          </button>
        </div>
      </header>
      <div className="free-roam__body">
        <div
          className="free-roam__stage"
          ref={stageRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={stopDragging}
          onWheel={handleWheel}
        >
          <div className="free-roam__viewport" style={viewportStyle}>
            <canvas ref={canvasRef} className="free-roam__canvas" />
            <div className="free-roam__overlay">
              {warcalls.map((entry) => (
                <div
                  key={entry.warcall.id}
                  className={`free-roam__marker free-roam__marker--warcall free-roam__marker--${entry.warcall.phase}`}
                  style={{
                    left: `${entry.xPercent}%`,
                    top: `${entry.yPercent}%`
                  }}
                  title={`${entry.warcall.kind} — ${entry.warcall.location}`}
                >
                  <span className="free-roam__marker-icon">⚔️</span>
                </div>
              ))}
              {officers.map((entry) => (
                <div
                  key={entry.officer.id}
                  className="free-roam__marker free-roam__marker--officer"
                  style={{
                    left: `${entry.xPercent}%`,
                    top: `${entry.yPercent}%`
                  }}
                  title={`${entry.officer.name} • ${BIOME_LABEL[entry.coordinate.biome]}`}
                >
                  <Portrait
                    officer={entry.officer}
                    size={48}
                    className="free-roam__marker-avatar"
                  />
                  <span className="free-roam__marker-label">
                    {entry.officer.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div ref={highlightHostRef} className="free-roam__highlight-host" />
        </div>
        <aside className="free-roam__sidebar">
          <section className="free-roam__panel">
            <h2>Aktive Warcalls</h2>
            {warcalls.length === 0 ? (
              <p className="free-roam__empty">Keine aktiven Warcalls.</p>
            ) : (
              <ul className="free-roam__list">
                {warcalls.map((entry) => (
                  <li key={entry.warcall.id} className="free-roam__list-item">
                    <div className="free-roam__list-title">
                      <strong>{entry.warcall.kind}</strong>
                      <span> • {entry.warcall.location}</span>
                    </div>
                    <div className="free-roam__list-meta">
                      {PHASE_LABEL[entry.warcall.phase]} •{' '}
                      {entry.warcall.participants.length} Teilnehmer
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="free-roam__panel">
            <h2>Offiziere im Blick</h2>
            {officers.length === 0 ? (
              <p className="free-roam__empty">Keine Offiziere verfügbar.</p>
            ) : (
              <ul className="free-roam__list">
                {officers.map((entry) => (
                  <li key={entry.officer.id} className="free-roam__list-item">
                    <div className="free-roam__list-title">
                      <strong>{entry.officer.name}</strong>
                      <span> • {entry.officer.rank}</span>
                    </div>
                    <div className="free-roam__list-meta">
                      Merit {Math.round(entry.officer.merit)} •{' '}
                      {BIOME_LABEL[entry.coordinate.biome]}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
