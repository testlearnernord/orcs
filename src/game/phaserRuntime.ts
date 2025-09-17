import type PhaserNamespace from "phaser";

/**
 * Returns the Phaser runtime exported by the CDN script.
 *
 * @throws {Error} Wenn Phaser vor dem Bootstrappen nicht global verfügbar ist.
 * @returns Der Phaser-Namespace aus dem globalen Scope.
 * @example
 * const Phaser = getPhaser();
 * const game = new Phaser.Game({ type: Phaser.AUTO });
 */
export function getPhaser(): typeof PhaserNamespace {
  const candidate = (globalThis as { Phaser?: typeof PhaserNamespace }).Phaser;
  if (!candidate) {
    throw new Error(
      "Phaser runtime not found on globalThis. Make sure to load the CDN script before importing the game." 
    );
  }
  return candidate;
}
