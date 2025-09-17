import { getPhaser } from "@game/phaserRuntime";
import BootScene from "@game/scenes/BootScene";
import PlayScene from "@game/scenes/PlayScene";

const Phaser = getPhaser();

export default class Game extends Phaser.Game {
  constructor(container: HTMLElement) {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: container,
      backgroundColor: "#0b0d10",
      width: window.innerWidth,
      height: window.innerHeight,
      pixelArt: true,

      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },

      physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
      scene: [BootScene, PlayScene]
    };
    super(config);
  }
}
