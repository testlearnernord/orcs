import { createRoot } from 'react-dom/client';
import { preloadPortraitSheets } from '@/features/portraits/preload';
import App from './App';

const container = document.getElementById('app');

if (!container) {
  throw new Error('#app not found');
}

void preloadPortraitSheets();

createRoot(container).render(<App />);
