import './bootstrap/debugGuard';
import { useEffect, useRef } from 'react';
import { GameStore } from '@state/store';
import { FLAGS } from '@state/flags';
import { UIModeStore, type GameMode } from '@state/ui/mode';
import { NemesisUI } from '@ui/root';
import { ModeGateOverlay } from '@ui/components/modeGate';
import '@ui/styles.css';

const store = new GameStore('nemesis-seed');
const uiMode = new UIModeStore();

function resolveInitialMode(): GameMode {
  if (typeof window === 'undefined') return 'spectate';
  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get('mode');
  if (modeParam === 'player' && FLAGS.PLAYER_MODE) {
    return 'player';
  }
  if (modeParam === 'freeRoam') {
    return 'freeRoam';
  }
  return 'spectate';
}

function syncUrl(mode: GameMode): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.get('mode') !== mode) {
    url.searchParams.set('mode', mode);
    window.history.replaceState(
      {},
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  }
}

const initialMode = resolveInitialMode();
uiMode.setMode(initialMode);
syncUrl(initialMode);

const ui = new NemesisUI(store, uiMode);

type NemesisApi = {
  store: GameStore;
  ui: NemesisUI;
  uiMode: UIModeStore;
  advanceCycle: () => void;
};

type NemesisWindow = Window & typeof globalThis & { nemesis?: NemesisApi };

const nemesisApi: NemesisApi = {
  store,
  ui,
  uiMode,
  advanceCycle: () => store.tick()
};

export default function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as NemesisWindow;
      win.nemesis = nemesisApi;
    }

    const host = hostRef.current;
    if (host) {
      ui.mount(host);
    } else {
      console.error('#app not found');
    }

    return () => {
      if (typeof window !== 'undefined') {
        const win = window as NemesisWindow;
        if (win.nemesis === nemesisApi) {
          delete win.nemesis;
        }
      }
      hostRef.current?.replaceChildren();
    };
  }, []);

  return (
    <>
      <div ref={hostRef} />
      <ModeGateOverlay modeStore={uiMode} initialMode={initialMode} />
    </>
  );
}
