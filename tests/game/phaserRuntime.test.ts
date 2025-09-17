import { afterEach, describe, expect, it } from "vitest";
import type PhaserNamespace from "phaser";
import { getPhaser } from "@game/phaserRuntime";

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    Phaser?: typeof PhaserNamespace;
  }
}

afterEach(() => {
  delete (globalThis as { Phaser?: typeof PhaserNamespace }).Phaser;
});

describe("getPhaser", () => {
  it("returns the global Phaser reference when present", () => {
    const stub = { Game: class {} } as unknown as typeof PhaserNamespace;
    (globalThis as { Phaser?: typeof PhaserNamespace }).Phaser = stub;

    expect(getPhaser()).toBe(stub);
  });

  it("throws a descriptive error when Phaser is missing", () => {
    delete (globalThis as { Phaser?: typeof PhaserNamespace }).Phaser;

    expect(() => getPhaser()).toThrow(/Phaser runtime not found/);
  });
});
