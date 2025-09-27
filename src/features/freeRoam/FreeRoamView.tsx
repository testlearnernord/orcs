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
import { toPercent } from '@/map/navgrid';
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
  const { map, warcalls, officers, cycle, idleSeconds, playerPosition, movePlayer, dynamicWarcalls } = useFreeRoam(store, {
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
        return;
      }
      
      // WASD movement controls
      switch (event.key.toLowerCase()) {
        case 'w':
          event.preventDefault();
          movePlayer('up');
          break;
        case 's':
          event.preventDefault();
          movePlayer('down');
          break;
        case 'a':
          event.preventDefault();
          movePlayer('left');
          break;
        case 'd':
          event.preventDefault();
          movePlayer('right');
          break;
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onRequestClose, movePlayer]);

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
              {/* Player position marker */}
              <div
                className="free-roam__marker free-roam__marker--player"
                style={{
                  left: `${playerPosition.xPercent}%`,
                  top: `${playerPosition.yPercent}%`
                }}
                title={`Spieler • ${BIOME_LABEL[playerPosition.coordinate.biome]} (${playerPosition.x}, ${playerPosition.y})`}
              >
                <span className="free-roam__marker-icon">🎯</span>
              </div>
              {/* Official warcalls */}
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
              {/* Dynamic AI-generated warcalls */}
              {dynamicWarcalls.map((entry) => (
                <div
                  key={entry.warcall.id}
                  className="free-roam__marker free-roam__marker--dynamic-warcall"
                  style={{
                    left: `${entry.xPercent}%`,
                    top: `${entry.yPercent}%`
                  }}
                  title={`[AI] ${entry.warcall.kind} — ${entry.warcall.location}`}
                >
                  <span className="free-roam__marker-icon">🗡️</span>
                </div>
              ))}
              {/* Officers with AI state indicators */}
              {officers.map((entry) => (
                <div
                  key={entry.officer.id}
                  className={`free-roam__marker free-roam__marker--officer free-roam__marker--officer-${entry.state}`}
                  style={{
                    left: `${entry.xPercent}%`,
                    top: `${entry.yPercent}%`
                  }}
                  title={`${entry.officer.name} • ${BIOME_LABEL[entry.coordinate.biome]} • ${entry.state.toUpperCase()}`}
                >
                  <Portrait
                    officer={entry.officer}
                    size={48}
                    className="free-roam__marker-avatar"
                  />
                  <span className="free-roam__marker-label">
                    {entry.officer.name}
                    {entry.state !== 'idle' && <span className="free-roam__marker-state"> ({entry.state})</span>}
                  </span>
                  {/* Show movement target indicator */}
                  {entry.target && (
                    <div 
                      className="free-roam__target-indicator"
                      style={{
                        left: `${toPercent(map, entry.target.x) - entry.xPercent}%`,
                        top: `${toPercent(map, entry.target.y) - entry.yPercent}%`
                      }}
                    >
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div ref={highlightHostRef} className="free-roam__highlight-host" />
        </div>
        <aside className="free-roam__sidebar">
          <section className="free-roam__panel">
            <h2>Spieler Position</h2>
            <div className="free-roam__player-info">
              <p><strong>Position:</strong> ({playerPosition.x}, {playerPosition.y})</p>
              <p><strong>Biom:</strong> {BIOME_LABEL[playerPosition.coordinate.biome]}</p>
              <p className="free-roam__controls">
                <small>WASD zum Bewegen • ESC zum Verlassen</small>
              </p>
            </div>
          </section>
          <section className="free-roam__panel">
            <h2>Aktive Warcalls</h2>
            {warcalls.length === 0 && dynamicWarcalls.length === 0 ? (
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
                {dynamicWarcalls.map((entry) => (
                  <li key={entry.warcall.id} className="free-roam__list-item free-roam__list-item--dynamic">
                    <div className="free-roam__list-title">
                      <strong>[AI] {entry.warcall.kind}</strong>
                      <span> • {entry.warcall.location}</span>
                    </div>
                    <div className="free-roam__list-meta">
                      KI-generiert • Auflösung in {entry.warcall.resolveOn - cycle} Zyklen
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
                      <span className={`free-roam__ai-state free-roam__ai-state--${entry.state}`}>
                        • {entry.state.toUpperCase()}
                      </span>
                    </div>
                    <div className="free-roam__list-meta">
                      Merit {Math.round(entry.officer.merit)} •{' '}
                      {BIOME_LABEL[entry.coordinate.biome]}
                      {entry.target && (
                        <span> • Ziel: ({entry.target.x}, {entry.target.y})</span>
                      )}
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
