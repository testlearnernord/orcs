export function portraitIndexFor(id: string, total: number): number {
  const normalized = id && id.length ? id : 'unknown-officer';
  const limit = Math.max(1, Math.floor(total));
  let hash = 0x811c9dc5 >>> 0;

  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0) % limit;
}
