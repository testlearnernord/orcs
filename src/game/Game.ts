import Phaser from "phaser";
import BootScene from "@game/scenes/BootScene";
import PlayScene from "@game/scenes/PlayScene";

export default class Game extends Phaser.Game {
  constructor(container: HTMLElement) {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: container,
      width: 960,
      height: 540,
      backgroundColor: "#0b0d10",
      pixelArt: true,
      physics: { default: "arcade", arcade: { gravity: { y: 0 } } },
      scene: [BootScene, PlayScene]
    };
    super(config);
  }
}