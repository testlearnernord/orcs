import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameStore } from '@state/store';
import type { Phase } from '@state/selectors/warcalls';
import Portrait from '@/ui/Portrait';
import {
  useSomaiaFreeRoam,
  DEFAULT_IDLE_MS,
  DEFAULT_OFFICER_LIMIT
} from './useSomaiaFreeRoam';

const PHASE_LABEL: Record<Phase, string> = {
  prep: 'Vorbereitung',
  travel: 'Auf dem Weg',
  event: 'Ereignis',
  resolution: 'Auflösung'
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

  const state = useSomaiaFreeRoam(store, {
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

  // Initialize camera for Somaia map
  const [camera, setCamera] = useState<CameraState>(() => {
    if (state.map) {
      return state.resetCamera();
    }
    return { scale: 1, x: 0, y: 0 };
  });

  const [showDebug, setShowDebug] = useState(false);
  const [showInteractionPopup, setShowInteractionPopup] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<any>(null);

  // Show interaction popup when near officer or warcall
  useEffect(() => {
    if ('nearbyInteractions' in state) {
      const typedState = state as typeof state & {
        nearbyInteractions: Array<{
          type: 'officer' | 'warcall';
          id: string;
          name: string;
          distance: number;
          data: any;
        }>;
      };
      if (typedState.nearbyInteractions.length > 0 && !showInteractionPopup) {
        // Auto-show popup for closest interaction
        const closest = typedState.nearbyInteractions[0];
        setSelectedInteraction(closest);
        setShowInteractionPopup(true);
      } else if (
        typedState.nearbyInteractions.length === 0 &&
        showInteractionPopup
      ) {
        setShowInteractionPopup(false);
        setSelectedInteraction(null);
      }
    }
  }, [state, showInteractionPopup]);

  const handleInteractionAction = useCallback(
    (action: string) => {
      if (!selectedInteraction) return;

      if (selectedInteraction.type === 'warcall') {
        switch (action) {
          case 'details':
            // TODO: Show warcall details modal
            console.log('Show warcall details:', selectedInteraction.data);
            break;
          case 'join':
            // TODO: Join warcall
            console.log('Join warcall:', selectedInteraction.data);
            store.tick(); // Advance cycle
            break;
          case 'ignore':
            setShowInteractionPopup(false);
            setSelectedInteraction(null);
            break;
        }
      } else if (selectedInteraction.type === 'officer') {
        switch (action) {
          case 'talk':
            // TODO: Open dialog
            console.log('Talk to officer:', selectedInteraction.data);
            break;
          case 'attack':
            // TODO: Initiate combat (not implemented yet)
            console.log('Attack officer:', selectedInteraction.data);
            store.tick(); // Advance cycle
            break;
          case 'ignore':
            setShowInteractionPopup(false);
            setSelectedInteraction(null);
            break;
        }
      }
    },
    [selectedInteraction, store]
  );

  // Note: Debug overlay temporarily disabled due to infinite loop issue
  // TODO: Fix infinite loop and re-enable F2 debug toggle

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.loading) {
      // Show loading state
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading Somaia...', canvas.width / 2, canvas.height / 2);
      return;
    }

    if (state.error) {
      // Show error state
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff6b6b';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Error loading map:',
        canvas.width / 2,
        canvas.height / 2 - 20
      );
      ctx.fillText(state.error, canvas.width / 2, canvas.height / 2 + 20);
      return;
    }

    if (state.map) {
      // Apply camera transform
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(camera.scale, camera.scale);
      ctx.translate(-camera.x, -camera.y);

      // Draw Somaia world map background
      ctx.fillStyle = '#2c5aa0'; // Ocean blue
      ctx.fillRect(0, 0, state.map.pixelSize.width, state.map.pixelSize.height);

      // Draw countries
      for (const country of state.map.countries) {
        ctx.fillStyle = country.active ? country.color : '#666666';
        ctx.globalAlpha = country.active ? 0.7 : 0.3;
        ctx.fillRect(
          country.region.x,
          country.region.y,
          country.region.width,
          country.region.height
        );
      }

      // Draw biomes
      ctx.globalAlpha = 0.8;
      for (const [biomeName, biome] of Object.entries(state.map.biomes)) {
        let color = '#90EE90'; // Default green for forests/plains
        if (biomeName === 'ocean') color = '#1e40af';
        if (biomeName === 'mountains') color = '#78716c';

        ctx.fillStyle = color;
        for (const region of biome.regions) {
          ctx.fillRect(region.x, region.y, region.width, region.height);
        }
      }

      ctx.globalAlpha = 1.0;
      ctx.restore();
    }
  }, [
    state.loading,
    state.error,
    state.map,
    state.cycle,
    camera.x,
    camera.y,
    camera.scale
  ]);

  // Debug toggle (F2) - temporarily disabled due to infinite loop
  /*
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault();
        setShowDebug((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  */

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
        if (showInteractionPopup) {
          setShowInteractionPopup(false);
          setSelectedInteraction(null);
        } else {
          onRequestClose();
        }
        return;
      }

      // Interaction keys when popup is shown
      if (showInteractionPopup && selectedInteraction) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            handleInteractionAction(
              selectedInteraction.type === 'warcall' ? 'details' : 'talk'
            );
            break;
          case '2':
            event.preventDefault();
            handleInteractionAction(
              selectedInteraction.type === 'warcall' ? 'join' : 'attack'
            );
            break;
          case '3':
            event.preventDefault();
            handleInteractionAction('ignore');
            break;
        }
        return;
      }

      // WASD movement controls
      if ('movePlayer' in state) {
        switch (event.key.toLowerCase()) {
          case 'w':
            event.preventDefault();
            state.movePlayer('up');
            break;
          case 's':
            event.preventDefault();
            state.movePlayer('down');
            break;
          case 'a':
            event.preventDefault();
            state.movePlayer('left');
            break;
          case 'd':
            event.preventDefault();
            state.movePlayer('right');
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [
    onRequestClose,
    state,
    showInteractionPopup,
    selectedInteraction,
    handleInteractionAction
  ]);

  const secondsUntilCycle = useMemo(
    () => formatIdleCountdown(idleMs, state.idleSeconds),
    [idleMs, state.idleSeconds]
  );

  const handleAdvanceCycle = useCallback(() => {
    store.tick();
  }, [store]);

  const handleResetCamera = useCallback(() => {
    if (state.map) {
      const reset = state.resetCamera();
      setCamera(reset);
    } else {
      setCamera({ scale: 1, x: 0, y: 0 });
    }
  }, [state]);

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
          <h1 id="free-roam-title">Free Roam - Somaia</h1>
          <p>
            Erkunde die Welt von Somaia. Aktuell in{' '}
            {state.currentCountry === 'grumthak'
              ? "Grum'thak"
              : 'unbekanntem Gebiet'}
            .
          </p>
        </div>
        <div className="free-roam__status">
          <span>Zyklus {state.cycle}</span>
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
              {/* Somaia map rendering with pixel-based positioning */}
              {state.map && (
                <>
                  {/* Player position marker */}
                  <div
                    className="free-roam__marker free-roam__marker--player"
                    style={{
                      left: `${(state.playerPosition.x / state.map.pixelSize.width) * 100}%`,
                      top: `${(state.playerPosition.y / state.map.pixelSize.height) * 100}%`
                    }}
                    title={`Spieler in ${state.currentCountry === 'grumthak' ? "Grum'thak" : 'Unbekannt'} (${state.playerPosition.x}, ${state.playerPosition.y})`}
                  >
                    <span className="free-roam__marker-icon">🎯</span>
                  </div>

                  {/* Warcalls */}
                  {state.warcalls.map((entry: any) => (
                    <div
                      key={entry.warcall.id}
                      className={`free-roam__marker free-roam__marker--warcall free-roam__marker--${entry.warcall.phase}`}
                      style={{
                        left: `${state.map ? (entry.x / state.map.pixelSize.width) * 100 : 50}%`,
                        top: `${state.map ? (entry.y / state.map.pixelSize.height) * 100 : 50}%`
                      }}
                      title={`${entry.warcall.kind} — ${entry.warcall.location || "Grum'thak"}`}
                    >
                      <span className="free-roam__marker-icon">⚔️</span>
                    </div>
                  ))}

                  {/* Officers with enhanced portraits */}
                  {state.officers.map((entry: any) => (
                    <div
                      key={entry.officer.id}
                      className={`free-roam__marker free-roam__marker--officer free-roam__marker--officer-${entry.state}`}
                      style={{
                        left: `${state.map ? (entry.x / state.map.pixelSize.width) * 100 : 50}%`,
                        top: `${state.map ? (entry.y / state.map.pixelSize.height) * 100 : 50}%`
                      }}
                      title={`${entry.officer.name} in Grum'thak • ${entry.state.toUpperCase()}`}
                    >
                      <Portrait officer={entry.officer} size={28} />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          <div ref={highlightHostRef} className="free-roam__highlight-host" />
        </div>
        <aside className="free-roam__sidebar">
          <section className="free-roam__panel">
            <h2>Spieler Position</h2>
            <div className="free-roam__player-info">
              <p>
                <strong>Position:</strong> ({Math.round(state.playerPosition.x)}
                , {Math.round(state.playerPosition.y)})
              </p>
              <p>
                <strong>Land:</strong>{' '}
                {state.currentCountry === 'grumthak'
                  ? "Grum'thak"
                  : 'Unbekannt'}
              </p>
              <p className="free-roam__controls">
                <small>
                  WASD zum Bewegen • Klicken für Interaktion • ESC zum Verlassen
                </small>
              </p>
            </div>
          </section>
          <section className="free-roam__panel">
            <h2>Aktive Warcalls</h2>
            {state.warcalls.length === 0 ? (
              <p className="free-roam__empty">Keine aktiven Warcalls.</p>
            ) : (
              <ul className="free-roam__list">
                {state.warcalls.map((warcall, index) => (
                  <li key={`${index}`} className="free-roam__list-item">
                    <div className="free-roam__list-title">
                      <strong>{(warcall as any).kind}</strong>
                      {'location' in warcall && (
                        <span> • {(warcall as any).location}</span>
                      )}
                    </div>
                    <div className="free-roam__list-meta">
                      {'phase' in warcall &&
                        PHASE_LABEL[
                          (warcall as any).phase as keyof typeof PHASE_LABEL
                        ]}{' '}
                      •{' '}
                      <span className="free-roam__list-risk">
                        Risiko: {Math.round((warcall as any).risk * 100)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="free-roam__panel">
            <h2>Offiziere ({state.officers.length})</h2>
            {state.officers.length === 0 ? (
              <p className="free-roam__empty">Keine Offiziere in der Nähe.</p>
            ) : (
              <ul className="free-roam__list">
                {state.officers.map((officer, index) => (
                  <li key={`${index}`} className="free-roam__list-item">
                    <div className="free-roam__list-title">
                      <strong>{(officer as any).name}</strong>
                      {(officer as any).state !== 'idle' && (
                        <span className="free-roam__list-state">
                          {' '}
                          • {(officer as any).state}
                        </span>
                      )}
                    </div>
                    <div className="free-roam__list-meta">
                      Position: ({Math.round((officer as any).x ?? 0)},{' '}
                      {Math.round((officer as any).y ?? 0)}) • Grum'thak
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {/* Interaction Popup */}
      {showInteractionPopup && selectedInteraction && (
        <div className="free-roam__interaction-overlay">
          <div className="free-roam__interaction-popup">
            <h3>
              {selectedInteraction.type === 'warcall'
                ? '⚔️ Warcall'
                : '👤 Offizier'}
            </h3>
            <p className="free-roam__interaction-name">
              <strong>{selectedInteraction.name}</strong>
            </p>
            <p className="free-roam__interaction-distance">
              Entfernung: {Math.round(selectedInteraction.distance)} Einheiten
            </p>

            <div className="free-roam__interaction-actions">
              {selectedInteraction.type === 'warcall' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleInteractionAction('details')}
                    className="free-roam__interaction-btn free-roam__interaction-btn--primary"
                  >
                    [1] Details ansehen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInteractionAction('join')}
                    className="free-roam__interaction-btn free-roam__interaction-btn--success"
                  >
                    [2] Warcall beitreten
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInteractionAction('ignore')}
                    className="free-roam__interaction-btn free-roam__interaction-btn--secondary"
                  >
                    [3] Ignorieren
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleInteractionAction('talk')}
                    className="free-roam__interaction-btn free-roam__interaction-btn--primary"
                  >
                    [1] Reden
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInteractionAction('attack')}
                    className="free-roam__interaction-btn free-roam__interaction-btn--danger"
                  >
                    [2] Angreifen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInteractionAction('ignore')}
                    className="free-roam__interaction-btn free-roam__interaction-btn--secondary"
                  >
                    [3] Ignorieren
                  </button>
                </>
              )}
            </div>

            <p className="free-roam__interaction-hint">
              <small>Verwende Tasten 1-3 oder ESC zum Schließen</small>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
