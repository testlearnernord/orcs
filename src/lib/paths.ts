/**
 * Base URL-safe path utilities for assets
 */

// Get base URL from Vite's import.meta.env with fallback
const rawBase = (import.meta as any)?.env?.BASE_URL ?? '/';
const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

// Fallback to correct base path for dev environment where BASE_URL might not be set correctly
export const baseUrl = normalizedBase === '/' ? '/orcs/' : normalizedBase;

/**
 * Create a base URL-safe asset path
 */
export function assetPath(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Create a map asset path
 */
export function mapAssetPath(mapId: string, filename: string): string {
  return assetPath(`assets/maps/${mapId}/${filename}`);
}
