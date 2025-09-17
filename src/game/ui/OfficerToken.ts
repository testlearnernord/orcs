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

const FOCUS_COLORS = {
  leader: 0xf6bd60,
  ally: 0x4cc9f0,
  support: 0x90be6d,
  rival: 0xef476f,
  hidden: 0xff6b6b
} as const;

const BASE_WIDTH = 128;
const BASE_HEIGHT = 140;

function shortName(name: string): string {
  const parts = name.split(" ");
  const first = parts[0] ?? name;
  return first.length > 12 ? `${first.slice(0, 11)}…` : first;
}

export type OfficerTokenFocus = keyof typeof FOCUS_COLORS;

export interface OfficerTokenOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  officer: Officer;
  portraitKey: string;
  scale?: number;
  highlight?: boolean;
  onHover?: (officer: Officer) => void;
  onBlur?: () => void;
}

export interface OfficerTokenUpdateOptions {
  highlight?: boolean;
  focus?: OfficerTokenFocus | null;
  scale?: number;
}

export interface OfficerTokenMoveOptions {
  immediate?: boolean;
}

/**
 * Stellt einen Offizier als klickbares Token im Spielfeld dar.
 *
 * @example
 * const token = new OfficerToken({ scene, x: 100, y: 120, officer, portraitKey: "officer-portrait-0" });
 * token.update(officer, { highlight: true });
 */
export class OfficerToken {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly visuals: Phaser.GameObjects.Container;
  private readonly focusRing: Phaser.GameObjects.Arc;
  private readonly frame: Phaser.GameObjects.Arc;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly labelBg: Phaser.GameObjects.Rectangle;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly detailText: Phaser.GameObjects.Text;
  private readonly hover?: (officer: Officer) => void;
  private readonly blur?: () => void;
  private currentOfficer: Officer;
  private currentScale = 1;
  private pulseTween?: Phaser.Tweens.Tween;
  private currentFocus: OfficerTokenFocus | null = null;

  constructor(options: OfficerTokenOptions) {
    this.scene = options.scene;
    this.hover = options.onHover;
    this.blur = options.onBlur;
    this.currentOfficer = options.officer;

    this.container = this.scene.add.container(options.x, options.y);
    this.container.setSize(BASE_WIDTH, BASE_HEIGHT);
    this.container.setDepth(1);

    const hitArea = new Phaser.Geom.Circle(0, 0, 58);
    this.container.setInteractive({
      hitArea,
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      useHandCursor: true
    });

    this.visuals = this.scene.add.container(0, 0);

    this.focusRing = this.scene.add.circle(0, 0, 54, 0xffffff, 0);
    this.focusRing.setStrokeStyle(0, 0xffffff, 0);

    this.frame = this.scene.add.circle(0, 0, 46, 0xffffff, 1);
    this.frame.setStrokeStyle(2, 0x0d1b2a, 0.65);

    this.portrait = this.scene.add.image(0, 0, options.portraitKey);
    this.portrait.setDisplaySize(88, 88);

    this.visuals.add([this.focusRing, this.frame, this.portrait]);

    this.labelBg = this.scene.add.rectangle(0, 50, 92, 36, 0x0b1118, 0.78).setOrigin(0.5, 0);

    this.nameText = this.scene.add
      .text(0, 52, shortName(options.officer.name), {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#f7f9fc",
        align: "center"
      })
      .setOrigin(0.5, 0)
      .setWordWrapWidth(84);

    this.detailText = this.scene.add
      .text(0, 68, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#a9b7c6",
        align: "center"
      })
      .setOrigin(0.5, 0)
      .setWordWrapWidth(84);

    this.container.add([this.visuals, this.labelBg, this.nameText, this.detailText]);

    this.container.on("pointerover", () => {
      this.container.setDepth(2);
      this.scene.input.setDefaultCursor("pointer");
      if (this.hover) this.hover(this.currentOfficer);
    });
    this.container.on("pointerout", () => {
      this.container.setDepth(1);
      this.scene.input.setDefaultCursor("default");
      if (this.blur) this.blur();
    });

    this.update(options.officer, {
      highlight: options.highlight,
      focus: null,
      scale: options.scale ?? 1
    });
  }

  private applyScale(scale: number): void {
    const clamped = Math.max(0.55, Math.min(1.25, scale));
    if (Math.abs(clamped - this.currentScale) < 0.01) {
      return;
    }
    this.currentScale = clamped;
    this.visuals.setScale(clamped);
    this.labelBg.setPosition(0, 48 * clamped);
    this.labelBg.setSize(90 * clamped, 34 * clamped);
    this.labelBg.displayWidth = 90 * clamped;
    this.labelBg.displayHeight = 34 * clamped;

    const nameSize = Math.max(10, Math.round(12 * clamped));
    const detailSize = Math.max(9, Math.round(10 * clamped));
    const wrap = Math.max(70, Math.round(84 * clamped));

    this.nameText.setFontSize(nameSize);
    this.nameText.setY(this.labelBg.y + 4 * clamped);
    this.nameText.setWordWrapWidth(wrap);

    this.detailText.setFontSize(detailSize);
    this.detailText.setY(this.nameText.y + 14 * clamped);
    this.detailText.setWordWrapWidth(wrap);
  }

  private stopPulse(): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.visuals.setScale(this.currentScale);
    }
    this.pulseTween = undefined;
  }

  private applyHighlight(alive: boolean, highlight: boolean | undefined): void {
    this.stopPulse();
    if (highlight && alive) {
      this.pulseTween = this.scene.tweens.add({
        targets: this.visuals,
        duration: 260,
        scale: this.currentScale * 1.08,
        yoyo: true,
        repeat: -1,
        ease: Phaser.Math.Easing.Sine.InOut
      });
    } else {
      this.visuals.setScale(this.currentScale);
    }
  }

  private applyFocus(alive: boolean, focus: OfficerTokenFocus | null): void {
    this.currentFocus = focus;
    if (focus && alive) {
      const color = FOCUS_COLORS[focus];
      this.focusRing.setStrokeStyle(4, color, 0.95);
      this.focusRing.setVisible(true);
    } else {
      this.focusRing.setStrokeStyle(0, 0xffffff, 0);
      this.focusRing.setVisible(false);
    }
  }

  /**
   * Aktualisiert das angezeigte Offiziersprofil.
   *
   * @example
   * token.update(officer, { highlight: true });
   */
  update(officer: Officer, options: OfficerTokenUpdateOptions = {}): void {
    this.currentOfficer = officer;
    if (options.scale !== undefined) {
      this.applyScale(options.scale);
    }
    this.nameText.setText(shortName(officer.name));
    this.detailText.setText(`${officer.rank} • Lv ${officer.level}`);

    const alive = officer.status === "ALIVE";
    const baseColor = alive ? RANK_COLORS[officer.rank] : 0x22252b;
    this.frame.setFillStyle(baseColor, alive ? 1 : 0.35);
    this.frame.setStrokeStyle(alive ? 2 : 2, 0x0d1b2a, alive ? 0.65 : 0.35);
    this.container.setAlpha(alive ? 1 : 0.55);
    this.portrait.setAlpha(alive ? 1 : 0.45);
    this.labelBg.setFillStyle(alive ? 0x0b1118 : 0x1b1f26, alive ? 0.8 : 0.5);

    this.applyHighlight(alive, options.highlight);
    this.applyFocus(alive, options.focus ?? this.currentFocus);
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
   * Setzt die Layout-Skalierung ohne zusätzliche Aktualisierung.
   */
  setScale(scale: number): void {
    this.applyScale(scale);
    this.visuals.setScale(this.currentScale);
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
    this.stopPulse();
    this.container.destroy(true);
  }
}
