import BootScene from "./scenes/BootScene.js";
import PlayScene from "./scenes/PlayScene.js";

export default class Game extends Phaser.Game {
  constructor(container) {
    const config = {
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
