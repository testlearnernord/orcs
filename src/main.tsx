import { createRoot } from 'react-dom/client';
import { preloadPortraitSheets } from '@/features/portraits/preload';
import App from './App';

preloadPortraitSheets();

const container = document.getElementById('app');

if (!container) {
  throw new Error('#app not found');
}
createRoot(container).render(<App />);
