import { getPhaser } from "@game/phaserRuntime";
import { World } from "@sim/world";

const Phaser = getPhaser();

export default class PlayScene extends Phaser.Scene {
  private world!: World;
  private info!: Phaser.GameObjects.Text;

  constructor() {
    super("Play");
  }

  create() {
    this.world = new World({ seed: Date.now() });
    this.info = this.add.text(8, 8, "Cycle 0", { fontSize: "14px" }).setDepth(10);

    this.input.keyboard!.on("keydown-E", () => {
      const summary = this.world.runCycle();
      this.info.setText(`Cycle ${summary.cycle} | Feed: ${summary.feed.length} | Resolved: ${summary.resolved.length}`);
      console.table(summary.feed.slice(-5));
    });

    this.add.text(8, 28, "Drück E für nächsten Cycle", { fontSize: "12px" });
  }

  update(_t: number, _d: number) {}
}
