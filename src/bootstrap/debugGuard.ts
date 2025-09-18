window.addEventListener('error', (e) =>
  console.error('window.error:', (e as any).error || e.message)
);
window.addEventListener('unhandledrejection', (e) =>
  console.error('unhandled:', (e as any).reason)
);
