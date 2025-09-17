import { getPhaser } from "@game/phaserRuntime";
import type { Officer } from "@sim/types";

const Phaser = getPhaser();

const RANK_COLORS: Record<Officer["rank"], number> = {
  Grunzer: 0x4b6c7a,
  "Späher": 0x4c956c,
  Captain: 0xffd166,
  "Anführer": 0xef476f,
  "Herausforderer": 0x9c89b8,
  "König": 0x118ab2
};

function shortName(name: string): string {
  const parts = name.split(" ");
  const first = parts[0] ?? name;
  return first.length > 12 ? `${first.slice(0, 11)}…` : first;
}

export interface OfficerTokenOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  officer: Officer;
  highlight?: boolean;
  onHover?: (officer: Officer) => void;
  onBlur?: () => void;
}

export interface OfficerTokenUpdateOptions {
  highlight?: boolean;
}

export interface OfficerTokenMoveOptions {
  immediate?: boolean;
}

/**
 * Stellt einen Offizier als klickbares Token im Spielfeld dar.
 *
 * @example
 * const token = new OfficerToken({ scene, x: 100, y: 120, officer });
 * token.update(officer, { highlight: true });
 */
export class OfficerToken {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly circle: Phaser.GameObjects.Arc;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly detailText: Phaser.GameObjects.Text;
  private readonly hover?: (officer: Officer) => void;
  private readonly blur?: () => void;
  private currentOfficer: Officer;

  constructor(options: OfficerTokenOptions) {
    this.scene = options.scene;
    this.hover = options.onHover;
    this.blur = options.onBlur;
    this.currentOfficer = options.officer;

    this.container = this.scene.add.container(options.x, options.y);
    this.container.setSize(96, 96);
    this.container.setDepth(1);

    const hitArea = new Phaser.Geom.Circle(0, 0, 36);
    this.container.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

    this.circle = this.scene.add.circle(0, 0, 30, 0xffffff, 1);
    this.circle.setStrokeStyle(2, 0x0d1b2a, 0.6);

    this.nameText = this.scene.add
      .text(0, -6, shortName(options.officer.name), {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#f7f9fc",
        align: "center"
      })
      .setOrigin(0.5, 0.5)
      .setWordWrapWidth(90);

    this.detailText = this.scene.add
      .text(0, 24, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#a9b7c6",
        align: "center"
      })
      .setOrigin(0.5, 0.5)
      .setWordWrapWidth(90);

    this.container.add([this.circle, this.nameText, this.detailText]);

    this.container.on("pointerover", () => {
      this.container.setDepth(2);
      if (this.hover) this.hover(this.currentOfficer);
    });
    this.container.on("pointerout", () => {
      this.container.setDepth(1);
      if (this.blur) this.blur();
    });

    this.update(options.officer, { highlight: options.highlight });
  }

  /**
   * Aktualisiert das angezeigte Offiziersprofil.
   *
   * @example
   * token.update(officer, { highlight: true });
   */
  update(officer: Officer, options: OfficerTokenUpdateOptions = {}): void {
    this.currentOfficer = officer;
    this.nameText.setText(shortName(officer.name));
    this.detailText.setText(`${officer.rank} • Lv ${officer.level}`);

    const alive = officer.status === "ALIVE";
    const baseColor = alive ? RANK_COLORS[officer.rank] : 0x2f3437;
    this.circle.setFillStyle(baseColor, alive ? 1 : 0.35);
    this.container.setAlpha(alive ? 1 : 0.45);

    this.scene.tweens.killTweensOf(this.container);

    let strokeColor = alive ? 0x0d1b2a : 0x2b1d1f;
    let strokeAlpha = alive ? 0.6 : 0.9;
    let strokeWidth = 2;

    if (options.highlight && alive) {
      strokeColor = 0xf6bd60;
      strokeAlpha = 0.95;
      strokeWidth = 3;
      this.scene.tweens.add({
        targets: this.container,
        duration: 240,
        scale: 1.1,
        yoyo: true,
        ease: Phaser.Math.Easing.Sine.InOut
      });
    } else {
      this.container.setScale(1);
    }

    this.circle.setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);
  }

  /**
   * Bewegt das Token sanft zu einer neuen Position.
   *
   * @example
   * token.setPosition(200, 180);
   */
  setPosition(x: number, y: number, options: OfficerTokenMoveOptions = {}): void {
    if (options.immediate) {
      this.container.setPosition(x, y);
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.container.x, this.container.y, x, y);
    if (distance < 4) {
      this.container.setPosition(x, y);
      return;
    }

    this.scene.tweens.add({
      targets: this.container,
      x,
      y,
      duration: 200 + distance * 0.4,
      ease: Phaser.Math.Easing.Sine.InOut
    });
  }

  /**
   * Liefert die aktuelle Bildschirmposition.
   *
   * @example
   * const { x, y } = token.getPosition();
   */
  getPosition(): Phaser.Types.Math.Vector2Like {
    return { x: this.container.x, y: this.container.y };
  }

  /**
   * Entfernt das Token inklusive aller Rendering-Ressourcen.
   *
   * @example
   * token.destroy();
   */
  destroy(): void {
    this.container.destroy(true);
  }
}
