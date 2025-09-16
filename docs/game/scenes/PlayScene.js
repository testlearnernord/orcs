import { World } from "../../sim/world.js";

export default class PlayScene extends Phaser.Scene {
  constructor() { super("Play"); }
  create() {
    this.world = new World({ seed: Date.now() });
    this.info = this.add.text(8, 8, "Cycle 0", { fontSize: "14px" }).setDepth(10);
    this.input.keyboard.on("keydown-E", () => {
      const result = this.world.runCycle();
      this.info.setText(`Cycle ${this.world.state.cycle} | Events: ${result.events.length}`);
      console.table(result.events.slice(0, 5));
    });
  }
  update() {}
}
