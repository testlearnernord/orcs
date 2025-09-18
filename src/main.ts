import './bootstrap/debugGuard';
import { GameStore } from './state/store';
import { NemesisUI } from './ui/root';
import './ui/styles.css';
=======
import { GameStore } from '@state/store';
import { NemesisUI } from '@ui/root';
import '@ui/styles.css';

const store = new GameStore('nemesis-seed');
const ui = new NemesisUI(store);

if (typeof window !== 'undefined') {
  (window as any).nemesis = { store, ui, advanceCycle: () => store.tick() };
=======
export function advanceCycle(): void {
  store.tick();
}

if (typeof window !== 'undefined') {
  (window as any).nemesis = { store, ui, advanceCycle };
  const root = document.getElementById('app');
  if (root) ui.mount(root);
  else console.error('#app not found');
}
