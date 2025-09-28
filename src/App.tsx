import './bootstrap/debugGuard';
import { useEffect, useRef, useState } from 'react';
import { GameStore } from '@state/store';
import { FLAGS } from '@state/flags';
import { UIModeStore, type GameMode } from '@state/ui/mode';
import { NemesisUI } from '@ui/root';
import { MainMenu, type MenuMode } from '@ui/components/mainMenu';
import { AudioManager } from '@ui/audio/manager';
import '@ui/styles.css';

const store = new GameStore('nemesis-seed');
const uiMode = new UIModeStore();
const audioManager = new AudioManager();

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

const ui = new NemesisUI(store, uiMode, audioManager);

type NemesisApi = {
  store: GameStore;
  ui: NemesisUI;
  uiMode: UIModeStore;
  audioManager: AudioManager;
  advanceCycle: () => void;
};

type NemesisWindow = Window & typeof globalThis & { nemesis?: NemesisApi };

const nemesisApi: NemesisApi = {
  store,
  ui,
  uiMode,
  audioManager,
  advanceCycle: () => store.tick()
};

export default function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [showMainMenu, setShowMainMenu] = useState(true);
  const mainMenuRef = useRef<MainMenu | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as NemesisWindow;
      win.nemesis = nemesisApi;
    }

    return () => {
      if (typeof window !== 'undefined') {
        const win = window as NemesisWindow;
        if (win.nemesis === nemesisApi) {
          delete win.nemesis;
        }
      }
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      console.error('#app not found');
      return;
    }

    if (showMainMenu) {
      // Clean up any existing UI
      if (mainMenuRef.current) {
        mainMenuRef.current.destroy();
        mainMenuRef.current = null;
      }

      // Clear host
      host.innerHTML = '';

      // Show main menu
      const menu = new MainMenu(audioManager);
      menu.on('menu:select', (mode: MenuMode) => {
        // Map MenuMode to GameMode
        const gameMode: GameMode = mode as GameMode;

        // Set the mode and sync URL
        uiMode.setMode(gameMode);
        syncUrl(gameMode);

        // Hide main menu and show game
        setShowMainMenu(false);
      });

      menu.mount(host);
      mainMenuRef.current = menu;
    } else {
      // Clean up main menu
      if (mainMenuRef.current) {
        mainMenuRef.current.destroy();
        mainMenuRef.current = null;
      }

      // Clear host
      host.innerHTML = '';

      // Show game UI
      ui.mount(host);
    }

    return () => {
      // Cleanup
      if (mainMenuRef.current) {
        mainMenuRef.current.destroy();
        mainMenuRef.current = null;
      }
    };
  }, [showMainMenu]);

  // Check URL for direct mode access (skip main menu)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode');
      if (modeParam && ['spectate', 'player', 'freeRoam'].includes(modeParam)) {
        // Direct mode access - skip main menu
        const gameMode = resolveInitialMode();
        uiMode.setMode(gameMode);
        setShowMainMenu(false);
      }
    }
  }, []);

  return <div ref={hostRef} />;
}
