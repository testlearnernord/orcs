import { getPhaser } from "@game/phaserRuntime";

const Phaser = getPhaser();

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Platzhalter: später Tileset/Sprites laden
  }

  create() {
    this.scene.start("Play");
  }
}
