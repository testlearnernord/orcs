import './bootstrap/debugGuard';
import { GameStore } from '@state/store';
import { FLAGS } from '@state/flags';
import { UIModeStore, type GameMode } from '@state/ui/mode';
import { NemesisUI } from '@ui/root';
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
  return 'spectate';
}

const initialMode = resolveInitialMode();
uiMode.setMode(initialMode);
if (typeof window !== 'undefined') {
  const url = new URL(window.location.href);
  if (url.searchParams.get('mode') !== initialMode) {
    url.searchParams.set('mode', initialMode);
    window.history.replaceState(
      {},
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  }
}

const ui = new NemesisUI(store, uiMode);

if (typeof window !== 'undefined') {
  (window as any).nemesis = {
    store,
    ui,
    uiMode,
    advanceCycle: () => store.tick()
  };
  const root = document.getElementById('app');
  if (root) ui.mount(root);
  else console.error('#app not found');
}
