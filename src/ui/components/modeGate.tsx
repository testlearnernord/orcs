import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FLAGS } from '@state/flags';
import type { GameMode, UIModeStore } from '@state/ui/mode';

const MODE_LABEL: Record<GameMode, string> = {
  spectate: 'Spectate',
  player: 'Player',
  freeRoam: 'Free Roam (Test)'
};

interface ModeGateOverlayProps {
  modeStore: UIModeStore;
  initialMode: GameMode;
}

function normalizeSelection(mode: GameMode, allowPlayer: boolean): GameMode {
  if (mode === 'player' && !allowPlayer) {
    return 'spectate';
  }
  return mode;
}

export function ModeGateOverlay({
  modeStore,
  initialMode
}: ModeGateOverlayProps): JSX.Element | null {
  const allowPlayer = FLAGS.PLAYER_MODE;
  const portalTarget =
    typeof document !== 'undefined' ? (document.body ?? null) : null;

  const resolvedInitial = useMemo(
    () => normalizeSelection(initialMode, allowPlayer),
    [initialMode, allowPlayer]
  );

  const [isOpen, setIsOpen] = useState(true);
  const [selection, setSelection] = useState<GameMode>(resolvedInitial);
  const startButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll<HTMLElement>('.mode-gate').forEach((element) => {
      if (element.dataset.gateVersion !== 'react') {
        element.remove();
      }
    });
  }, []);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      startButtonRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    return modeStore.on('mode:changed', (next) => {
      setSelection(normalizeSelection(next.mode, allowPlayer));
    });
  }, [modeStore, allowPlayer]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const confirm = useCallback(
    (mode: GameMode) => {
      const resolved = normalizeSelection(mode, allowPlayer);
      setSelection(resolved);
      modeStore.setMode(resolved);
      close();
    },
    [allowPlayer, close, modeStore]
  );

  const handleStart = useCallback(() => {
    confirm(selection);
  }, [confirm, selection]);

  const handleSelect = useCallback(
    (mode: GameMode) => {
      if (mode === 'player' && !allowPlayer) {
        return;
      }
      confirm(mode);
    },
    [allowPlayer, confirm]
  );

  if (!isOpen || !portalTarget) {
    return null;
  }

  const startLabel =
    selection === 'spectate'
      ? 'Spectate starten'
      : `${MODE_LABEL[selection]} starten`;

  return createPortal(
    <div className="mode-gate" data-gate-version="react" role="presentation">
      <div
        className="mode-gate__backdrop"
        onClick={close}
        role="presentation"
      />
      <section className="mode-gate__panel" role="dialog" aria-modal="true">
        <header>
          <h2>Wähle deinen Modus</h2>
          <p>
            Erkunde die Nemesis-Hierarchie als Beobachter. Der Spieler-Modus
            folgt später.
          </p>
        </header>
        <div className="mode-gate__options">
          <button
            type="button"
            data-mode="spectate"
            className={selection === 'spectate' ? 'is-active' : undefined}
            onClick={() => handleSelect('spectate')}
          >
            <span className="mode-gate__mode">Spectate</span>
            <span className="mode-gate__hint">
              Standardmodus • Keine Spielerfigur
            </span>
          </button>
          <button
            type="button"
            data-mode="freeRoam"
            className={selection === 'freeRoam' ? 'is-active' : undefined}
            onClick={() => handleSelect('freeRoam')}
          >
            <span className="mode-gate__mode">Free Roam (Test)</span>
            <span className="mode-gate__hint">
              Simulation live auf Karte ansehen
            </span>
          </button>
          <button
            type="button"
            data-mode="player"
            disabled={!allowPlayer}
            className={
              [
                selection === 'player' ? 'is-active' : undefined,
                !allowPlayer ? 'is-disabled' : undefined
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            onClick={() => handleSelect('player')}
            title={
              allowPlayer ? undefined : 'Im Spectate-Mode noch nicht verfügbar.'
            }
          >
            <span className="mode-gate__mode">Player</span>
            <span className="mode-gate__hint">Coming soon</span>
          </button>
        </div>
        <footer>
          <button
            type="button"
            data-action="start"
            onClick={handleStart}
            ref={startButtonRef}
          >
            {startLabel}
          </button>
        </footer>
      </section>
    </div>,
    portalTarget
  );
}
