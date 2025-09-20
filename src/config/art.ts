export type ArtSet = 'realistic' | 'legacy';

function getStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // Zugriff verweigert (z. B. Safari Private Mode)
  }
  return null;
}

function readActive(storage: Storage | null): ArtSet {
  if (!storage) return 'realistic';
  const stored = storage.getItem('art.active');
  return stored === 'legacy' || stored === 'realistic' ? stored : 'realistic';
}

const storage = getStorage();
const baseUrl =
  typeof import.meta !== 'undefined'
    ? ((import.meta as unknown as { env?: { BASE_URL?: string } }).env
        ?.BASE_URL ?? '/')
    : '/';

export const ArtConfig = {
  // Standardmäßig echte Portraits aktivieren. Per localStorage übersteuerbar.
  active: readActive(storage),
  // Pages-sicherer Basis-Pfad (achtet auf /orcs/ BASE_URL)
  base: new URL('assets/orcs/portraits/', baseUrl).toString(),
  // Die beiden bereits hochgeladenen Dateien
  atlases: ['set_a.webp', 'set_b.webp'] as const
} as const;

export function setArtMode(mode: ArtSet): void {
  try {
    storage?.setItem('art.active', mode);
  } catch {
    // Ignoriert Storage-Fehler (z. B. wenn Storage voll ist)
  }
  (ArtConfig as { active: ArtSet }).active = mode;
}
