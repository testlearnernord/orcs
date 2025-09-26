import { useEffect, useMemo, useRef } from 'react';
import type { GameStore } from '@state/store';
import type { UIModeStore } from '@state/ui/mode';
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
  modeStore: UIModeStore;
}

export function FreeRoamView({ store, modeStore }: FreeRoamViewProps) {
  const idleMs = DEFAULT_IDLE_MS;
  const { map, warcalls, officers, cycle, idleSeconds } = useFreeRoam(store, {
    mapSize: DEFAULT_MAP_SIZE,
    officerLimit: DEFAULT_OFFICER_LIMIT,
    idleMs
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frame = requestAnimationFrame(() => {
      renderWorldMap(canvas, map);
    });
    return () => cancelAnimationFrame(frame);
  }, [map]);

  const secondsUntilCycle = useMemo(() => {
    const total = Math.ceil(idleMs / 1000);
    return Math.max(0, total - idleSeconds);
  }, [idleMs, idleSeconds]);

  const handleExit = () => {
    modeStore.setMode('spectate');
  };

  const handleAdvanceCycle = () => {
    store.tick();
  };

  return (
    <div className="free-roam">
      <header className="free-roam__hud">
        <div className="free-roam__title">
          <h1>Free Roam (Test)</h1>
          <p>Erkunde die Nemesis-Simulation direkt auf der Weltkarte.</p>
        </div>
        <div className="free-roam__status">
          <span>Zyklus {cycle}</span>
          <span>Nächster Auto-Cycle in {secondsUntilCycle}s</span>
        </div>
        <div className="free-roam__actions">
          <button type="button" onClick={handleAdvanceCycle}>
            Cycle auslösen
          </button>
          <button type="button" onClick={handleExit}>
            Zurück
          </button>
        </div>
      </header>
      <div className="free-roam__body">
        <div className="free-roam__stage">
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
