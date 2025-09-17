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
  ally: 0x90be6d,
  support: 0x4cc9f0,
  rival: 0xef476f,
  hidden: 0xff6b6b,
  blood: 0x577590
} as const;

const MODE_DETAIL_COLORS = {
  ACTIVITY: "#d1d9e6",
  RELATIONSHIPS: "#c5f6fa",
  WARCALLS: "#fdfcdc",
  PERSONALITY: "#ffe0b2",
  LOYALTY: "#d0f4de"
} as const satisfies Record<string, string>;

const MODE_BADGE_COLORS = {
  ACTIVITY: 0x0b1118,
  RELATIONSHIPS: 0x0f2f3a,
  WARCALLS: 0x301b3f,
  PERSONALITY: 0x3a1f12,
  LOYALTY: 0x1d3320
} as const satisfies Record<string, number>;

const BASE_NAME_Y = 60;
const BASE_DETAIL_GAP = 18;
const BASE_LABEL_WIDTH = 112;
const BASE_LABEL_HEIGHT = 54;
const BASE_BADGE_OFFSET = 46;
const BASE_BADGE_RADIUS = 18;

function shortName(name: string): string {
  const parts = name.split(" ");
  const first = parts[0] ?? name;
  return first.length > 14 ? `${first.slice(0, 13)}…` : first;
}

export type OfficerTokenFocus = keyof typeof FOCUS_COLORS;

export type OfficerTokenMode = keyof typeof MODE_DETAIL_COLORS;

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
  onClick?: (officer: Officer, pointer: Phaser.Input.Pointer) => void;
}

export interface OfficerTokenUpdateOptions {
  highlight?: boolean;
  focus?: OfficerTokenFocus | null;
  scale?: number;
  detailText?: string;
  detailAccent?: number;
  badgeText?: string | null;
  badgeColor?: number;
  dimmed?: boolean;
  crossed?: boolean;
  mode?: OfficerTokenMode;
  portraitKey?: string;
}

export interface OfficerTokenMoveOptions {
  immediate?: boolean;
}

/**
 * Stellt einen Offizier als klickbares, animiertes Token im Hierarchie-Board dar.
 */
export class OfficerToken {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly focusRing: Phaser.GameObjects.Arc;
  private readonly frame: Phaser.GameObjects.Arc;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly labelBg: Phaser.GameObjects.Rectangle;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly detailText: Phaser.GameObjects.Text;
  private readonly badgeBg: Phaser.GameObjects.Arc;
  private readonly badgeText: Phaser.GameObjects.Text;
  private readonly cross: Phaser.GameObjects.Graphics;
  private readonly hover?: (officer: Officer) => void;
  private readonly blur?: () => void;
  private readonly click?: (officer: Officer, pointer: Phaser.Input.Pointer) => void;
  private currentOfficer: Officer;
  private currentScale = 1;
  private currentMode: OfficerTokenMode = "ACTIVITY";
  private currentBadgeColor: number = MODE_BADGE_COLORS.ACTIVITY;
  private currentPortraitKey: string;
  private highlightTween?: Phaser.Tweens.Tween;
  private crossVisible = false;

  constructor(options: OfficerTokenOptions) {
    this.scene = options.scene;
    this.hover = options.onHover;
    this.blur = options.onBlur;
    this.click = options.onClick;
    this.currentOfficer = options.officer;
    this.currentPortraitKey = options.portraitKey;

    this.container = this.scene.add.container(options.x, options.y);
    this.container.setSize(140, 160);
    this.container.setDepth(1);

    const hitArea = new Phaser.Geom.Circle(0, 0, 60);
    this.container.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

    this.body = this.scene.add.container(0, 0);

    this.focusRing = this.scene.add.circle(0, 0, 66, 0xffffff, 0);
    this.focusRing.setStrokeStyle(0, 0xffffff, 0);

    this.frame = this.scene.add.circle(0, 0, 56, RANK_COLORS[options.officer.rank] ?? 0x27323f, 1);
    this.frame.setStrokeStyle(3, 0x0b1118, 0.8);

    this.portrait = this.scene.add.image(0, 0, options.portraitKey);
    this.portrait.setDisplaySize(96, 96);
    this.portrait.setMask(this.frame.createBitmapMask());

    this.labelBg = this.scene.add.rectangle(0, BASE_NAME_Y, BASE_LABEL_WIDTH, BASE_LABEL_HEIGHT, 0x0b1118, 0.88);
    this.labelBg.setOrigin(0.5, 0);
    this.labelBg.setStrokeStyle(1, 0x1c2731, 0.6);

    this.nameText = this.scene.add
      .text(0, BASE_NAME_Y + 6, shortName(options.officer.name), {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#f7f9fc",
        align: "center"
      })
      .setOrigin(0.5, 0)
      .setWordWrapWidth(BASE_LABEL_WIDTH - 12);

    this.detailText = this.scene.add
      .text(0, BASE_NAME_Y + 6 + BASE_DETAIL_GAP, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: MODE_DETAIL_COLORS.ACTIVITY,
        align: "center"
      })
      .setOrigin(0.5, 0)
      .setWordWrapWidth(BASE_LABEL_WIDTH - 12);

    this.badgeBg = this.scene.add.circle(BASE_BADGE_OFFSET, -BASE_BADGE_OFFSET, BASE_BADGE_RADIUS, MODE_BADGE_COLORS.ACTIVITY, 0.95);
    this.badgeBg.setStrokeStyle(2, 0xffffff, 0.35);
    this.badgeBg.setVisible(false);

    this.badgeText = this.scene.add
      .text(BASE_BADGE_OFFSET, -BASE_BADGE_OFFSET, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#f7f9fc"
      })
      .setOrigin(0.5, 0.5);
    this.badgeText.setVisible(false);

    this.cross = this.scene.add.graphics();
    this.cross.setVisible(false);
    this.cross.setAlpha(0);
    this.drawCross();

    this.body.add([this.focusRing, this.frame, this.portrait, this.cross]);
    this.container.add([this.body, this.labelBg, this.nameText, this.detailText, this.badgeBg, this.badgeText]);

    this.container.on("pointerover", () => {
      this.container.setDepth(3);
      this.scene.input.setDefaultCursor("pointer");
      if (this.hover) this.hover(this.currentOfficer);
    });
    this.container.on("pointerout", () => {
      this.container.setDepth(1);
      this.scene.input.setDefaultCursor("default");
      if (this.blur) this.blur();
    });
    this.container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.click) this.click(this.currentOfficer, pointer);
    });

    this.applyScale(options.scale ?? 1);
    this.applyHighlight(options.highlight ?? false);
  }

  update(officer: Officer, options: OfficerTokenUpdateOptions = {}): void {
    this.currentOfficer = officer;
    this.nameText.setText(shortName(officer.name));
    const rankColor = RANK_COLORS[officer.rank] ?? 0x27323f;
    this.frame.fillColor = rankColor;

    if (options.portraitKey && options.portraitKey !== this.currentPortraitKey) {
      this.currentPortraitKey = options.portraitKey;
      this.portrait.setTexture(options.portraitKey);
      this.portrait.setDisplaySize(96, 96);
    }

    if (options.scale !== undefined) {
      this.applyScale(options.scale);
    }

    this.applyHighlight(options.highlight ?? false);
    this.applyFocus(options.focus ?? null);

    if (options.mode) {
      this.currentMode = options.mode;
      this.detailText.setColor(MODE_DETAIL_COLORS[options.mode]);
      this.badgeBg.fillColor = MODE_BADGE_COLORS[options.mode];
      this.currentBadgeColor = MODE_BADGE_COLORS[options.mode];
    }

    if (options.detailText !== undefined) {
      this.setDetail(options.detailText, options.detailAccent);
    }

    if (options.badgeText !== undefined) {
      this.setBadge(options.badgeText, options.badgeColor);
    }

    if (options.dimmed !== undefined) {
      this.setDimmed(options.dimmed);
    }

    if (options.crossed !== undefined) {
      this.setCrossed(options.crossed);
    }
  }

  setDetail(text: string, accent?: number): void {
    this.detailText.setText(text);
    if (accent !== undefined) {
      const color = Phaser.Display.Color.IntegerToColor(accent).rgba;
      this.detailText.setColor(color);
    } else {
      this.detailText.setColor(MODE_DETAIL_COLORS[this.currentMode]);
    }
  }

  setBadge(text: string | null, color?: number): void {
    if (!text) {
      this.badgeBg.setVisible(false);
      this.badgeText.setVisible(false);
      return;
    }
    this.badgeBg.setVisible(true);
    this.badgeText.setVisible(true);
    this.badgeText.setText(text);
    const badgeColor = color ?? this.currentBadgeColor;
    this.badgeBg.fillColor = badgeColor;
  }

  setDimmed(dimmed: boolean): void {
    this.container.setAlpha(dimmed ? 0.55 : 1);
  }

  setCrossed(crossed: boolean): void {
    if (crossed === this.crossVisible) return;
    this.crossVisible = crossed;
    if (crossed) {
      this.cross.setVisible(true);
      this.cross.setAlpha(0);
      this.scene.tweens.add({
        targets: this.cross,
        alpha: 1,
        duration: 300,
        ease: Phaser.Math.Easing.Cubic.Out
      });
      this.scene.tweens.add({
        targets: this.portrait,
        alpha: 0.2,
        duration: 300,
        ease: Phaser.Math.Easing.Quadratic.InOut
      });
    } else {
      this.scene.tweens.add({
        targets: this.cross,
        alpha: 0,
        duration: 200,
        ease: Phaser.Math.Easing.Cubic.In,
        onComplete: () => this.cross.setVisible(false)
      });
      this.scene.tweens.add({
        targets: this.portrait,
        alpha: 1,
        duration: 200,
        ease: Phaser.Math.Easing.Quadratic.Out
      });
    }
  }

  flash(color: number, duration = 450): void {
    const original = this.frame.fillColor;
    this.frame.setFillStyle(color, 1);
    this.scene.tweens.add({
      targets: this.frame,
      duration,
      ease: Phaser.Math.Easing.Sine.InOut,
      onComplete: () => {
        this.frame.setFillStyle(original, 1);
      }
    });
  }

  markFallen(): void {
    this.setCrossed(true);
    this.scene.tweens.add({
      targets: this.body,
      angle: { from: -6, to: 6 },
      duration: 280,
      yoyo: true,
      repeat: 2,
      ease: Phaser.Math.Easing.Sine.InOut,
      onComplete: () => {
        this.body.setAngle(0);
      }
    });
  }

  setPosition(x: number, y: number, options: OfficerTokenMoveOptions = {}): void {
    if (options.immediate) {
      this.container.setPosition(x, y);
      return;
    }
    this.scene.tweens.add({
      targets: this.container,
      x,
      y,
      duration: 450,
      ease: Phaser.Math.Easing.Cubic.Out
    });
  }

  getPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.container.x, this.container.y);
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  destroy(): void {
    this.highlightTween?.stop();
    this.container.destroy(true);
  }

  private applyScale(scale: number): void {
    const clamped = Phaser.Math.Clamp(scale, 0.6, 1.25);
    if (Math.abs(clamped - this.currentScale) < 0.01) {
      return;
    }
    this.currentScale = clamped;
    this.body.setScale(clamped);
    this.labelBg.setScale(clamped);

    const nameSize = Math.max(12, Math.round(16 * clamped));
    const detailSize = Math.max(10, Math.round(12 * clamped));
    const wrap = Math.max(68, Math.round((BASE_LABEL_WIDTH - 12) * clamped));
    const nameY = BASE_NAME_Y * clamped + 6 * clamped;
    const detailY = nameY + BASE_DETAIL_GAP * clamped;

    this.labelBg.setPosition(0, BASE_NAME_Y * clamped);
    this.labelBg.setSize(BASE_LABEL_WIDTH * clamped, BASE_LABEL_HEIGHT * clamped);
    this.labelBg.displayWidth = BASE_LABEL_WIDTH * clamped;
    this.labelBg.displayHeight = BASE_LABEL_HEIGHT * clamped;

    this.nameText.setFontSize(nameSize);
    this.nameText.setY(nameY);
    this.nameText.setWordWrapWidth(wrap);

    this.detailText.setFontSize(detailSize);
    this.detailText.setY(detailY);
    this.detailText.setWordWrapWidth(wrap);

    const badgeOffset = BASE_BADGE_OFFSET * clamped;
    this.badgeBg.setPosition(badgeOffset, -badgeOffset);
    this.badgeBg.setRadius(BASE_BADGE_RADIUS * clamped);
    this.badgeText.setPosition(badgeOffset, -badgeOffset);
    this.badgeText.setFontSize(Math.max(12, Math.round(16 * clamped)));
  }

  private applyHighlight(highlight: boolean): void {
    this.highlightTween?.stop();
    this.highlightTween = undefined;
    this.body.setScale(this.currentScale);

    if (!highlight) return;

    this.highlightTween = this.scene.tweens.add({
      targets: this.body,
      scale: this.currentScale * 1.06,
      duration: 420,
      ease: Phaser.Math.Easing.Sine.InOut,
      yoyo: true,
      repeat: -1
    });
  }

  private applyFocus(focus: OfficerTokenFocus | null): void {
    if (!focus) {
      this.focusRing.setStrokeStyle(0, 0xffffff, 0);
      return;
    }
    const color = FOCUS_COLORS[focus];
    this.focusRing.setStrokeStyle(4, color, 0.9);
  }

  private drawCross(): void {
    this.cross.clear();
    this.cross.lineStyle(6, 0xff6b6b, 0.9);
    this.cross.beginPath();
    this.cross.moveTo(-44, -44);
    this.cross.lineTo(44, 44);
    this.cross.moveTo(44, -44);
    this.cross.lineTo(-44, 44);
    this.cross.strokePath();
  }
}

export default OfficerToken;
