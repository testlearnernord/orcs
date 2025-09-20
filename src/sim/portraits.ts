export function getPortraitSeed(id: string): string {
  if (!id) return 'default';
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return `seed_${hash >>> 0}`;
}
