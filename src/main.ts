import { GameStore } from '@state/store';
import { NemesisUI } from '@ui/root';
import '@ui/styles.css';


const store = new GameStore('nemesis-seed');
const ui = new NemesisUI(store);

export function advanceCycle(): void {
  store.tick();
}

// expose for manual debugging when running the client
if (typeof window !== 'undefined') {
  (window as any).nemesis = {
    store,
    ui,
    advanceCycle
  };
}
