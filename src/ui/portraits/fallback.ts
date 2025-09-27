export function makeSilhouetteDataURL(size = 96): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#101820';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#2e3a23';
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.42, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillRect(size * 0.22, size * 0.6, size * 0.56, size * 0.28);

  return canvas.toDataURL('image/png');
}
