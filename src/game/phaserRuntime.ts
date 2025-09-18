import PhaserNamespace from "phaser";

let cachedRuntime: typeof PhaserNamespace | undefined;

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
  if (cachedRuntime) {
    return cachedRuntime;
  }

  const globalRuntime = (globalThis as { Phaser?: typeof PhaserNamespace }).Phaser;
  if (globalRuntime) {
    cachedRuntime = globalRuntime;
    return cachedRuntime;
  }

  if (PhaserNamespace) {
    cachedRuntime = PhaserNamespace;

    // Stellt sicher, dass wiederholte Aufrufe – z. B. aus Debug-Konsolen –
    // den gleichen Namespace erhalten.
    (globalThis as { Phaser?: typeof PhaserNamespace }).Phaser ??= cachedRuntime;

    return cachedRuntime;
  }

  throw new Error(
    "Phaser runtime not found on globalThis. Make sure to load the CDN script before importing the game."
  );
}
