import { getPhaser } from "@game/phaserRuntime";
import { OfficerToken, type OfficerTokenFocus, type OfficerTokenMode } from "@game/ui/OfficerToken";
import { describeOfficerActivity } from "@game/ui/activity";
import { collectHighlightIds } from "@game/ui/highlights";
import { computeHierarchyLayout, type HierarchyLevel } from "@game/ui/hierarchy";
import type { BoardArea } from "@game/ui/layout";
import { ensurePortraitTextures, portraitIndexForId } from "@game/ui/portraits";
import { WARCALL_TYPE_LABELS, WARCALL_TYPE_ICONS, resolveParticipantRole } from "@game/ui/warcallUi";
import { estimateWarcallSuccess } from "@sim/insights";
import type { CycleSummary, CycleTrigger, Officer, Rank, Warcall } from "@sim/types";
import { World } from "@sim/world";

const Phaser = getPhaser();

const TRIGGER_LABELS: Record<CycleTrigger, string> = {
  WARCALL_COMPLETED: "Warcall abgeschlossen",
  FREE_ROAM_TIMEOUT: "Freies Spiel (Timeout)",
  OFFICER_DEATH: "Offizier gefallen",
  DEBUG: "Debug"
};

const RANK_ORDER: Record<Rank, number> = {
  Grunzer: 0,
  "Späher": 1,
  Captain: 2,
  "Anführer": 3,
  "Herausforderer": 4,
  "König": 5
};

const MODE_LABELS = {
  ACTIVITY: "Aktivität",
  RELATIONSHIPS: "Beziehungen",
  WARCALLS: "Warcalls",
  PERSONALITY: "Persönlichkeit",
  LOYALTY: "Loyalität"
} as const satisfies Record<OfficerTokenMode, string>;

type OfficerViewMode = keyof typeof MODE_LABELS;

type CinematicEventKind = "PROMOTION" | "DEMOTION" | "DEATH" | "WARCALL" | "PURGE" | "REPLACEMENT";

interface CinematicEvent {
  kind: CinematicEventKind;
  title: string;
  description: string;
  officerId?: string;
  targetId?: string;
  warcallId?: string;
  tone?: number;
  duration?: number;
}

interface WarcallInvolvement {
  warcall: Warcall;
  role: string;
  isHost: boolean;
  hiddenRole?: string;
}

interface LoyaltyProfile {
  text: string;
  badge: string | null;
  badgeColor: number;
  focus: OfficerTokenFocus | null;
  dimmed: boolean;
}

interface RelationshipDescriptor {
  label: string;
  badge: string | null;
  color: number;
  focus: OfficerTokenFocus | null;
  dimmed: boolean;
}

const RELATION_BADGE_COLORS = {
  SELF: 0x9c6644,
  ALLY: 0x2f9e44,
  BLOOD: 0x3a86ff,
  RIVAL: 0xd00000,
  NEUTRAL: 0x343a40
} as const;

const WARCALL_BADGE_COLORS = {
  HOST: 0x8d3f88,
  SUPPORT: 0x2f9e44,
  RIVAL: 0xd00000,
  HIDDEN: 0xe85d04,
  UNKNOWN: 0x495057
} as const;

const EVENT_TONES: Record<CinematicEventKind, number> = {
  PROMOTION: 620,
  DEMOTION: 260,
  DEATH: 180,
  WARCALL: 420,
  PURGE: 150,
  REPLACEMENT: 520
};

function shortName(name: string): string {
  const trimmed = name.split(" ")[0] ?? name;
  return trimmed.length > 10 ? `${trimmed.slice(0, 9)}…` : trimmed;
}

function compareByMerit(a: Officer, b: Officer): number {
  return b.merit - a.merit || b.level - a.level || a.name.localeCompare(b.name);
}

function rankValue(rank: Rank): number {
  return RANK_ORDER[rank] ?? 0;
}

export default class PlayScene extends Phaser.Scene {
  private world!: World;
  private boardBg!: Phaser.GameObjects.Rectangle;
  private sidebarBg!: Phaser.GameObjects.Rectangle;
  private levelBands: Phaser.GameObjects.Rectangle[] = [];
  private levelLabels: Phaser.GameObjects.Text[] = [];
  private connections!: Phaser.GameObjects.Graphics;
  private cycleText!: Phaser.GameObjects.Text;
  private triggerText!: Phaser.GameObjects.Text;
  private dominanceLabel!: Phaser.GameObjects.Text;
  private dominanceDesc!: Phaser.GameObjects.Text;
  private feedLabel!: Phaser.GameObjects.Text;
  private feedText!: Phaser.GameObjects.Text;
  private warcallLabel!: Phaser.GameObjects.Text;
  private warcallsText!: Phaser.GameObjects.Text;
  private detailLabel!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private cemeteryButton!: Phaser.GameObjects.Text;
  private cemeteryOverlay!: Phaser.GameObjects.Container;
  private cemeteryScrim!: Phaser.GameObjects.Rectangle;
  private cemeteryListText!: Phaser.GameObjects.Text;
  private overlayContainer!: Phaser.GameObjects.Container;
  private overlayBg!: Phaser.GameObjects.Rectangle;
  private overlayPanel!: Phaser.GameObjects.Rectangle;
  private overlayTitle!: Phaser.GameObjects.Text;
  private overlaySubtitle!: Phaser.GameObjects.Text;
  private overlayHint!: Phaser.GameObjects.Text;
  private overlayActive = false;
  private overlayQueue: CinematicEvent[] = [];
  private overlayTimer?: Phaser.Time.TimerEvent;
  private officerTokens = new Map<string, OfficerToken>();
  private highlightIds: Set<string> = new Set();
  private viewButtons = new Map<OfficerViewMode, Phaser.GameObjects.Container>();
  private viewMode: OfficerViewMode = "ACTIVITY";
  private selectedOfficerId: string | null = null;
  private hoveredOfficerId: string | null = null;
  private boardArea: BoardArea = { x: 120, y: 120, width: 640, height: 460 };
  private portraitKeys: string[] = [];
  private officerPortraitMap = new Map<string, string>();
  private lastSummary?: CycleSummary;

  constructor() {
    super("Play");
  }

  create(): void {
    this.world = new World({ seed: Date.now() });
    this.portraitKeys = ensurePortraitTextures(this);
    this.officerPortraitMap.clear();

    this.createBoardBackground();
    this.createSidebar();
    this.createViewButtons();
    this.createCycleOverlay();
    this.initializeCemetery();

    this.connections = this.add.graphics();
    this.connections.setDepth(0.3);

    this.boardBg.on("pointerdown", () => {
      if (this.viewMode === "RELATIONSHIPS") {
        this.selectedOfficerId = null;
        this.applyViewModeToTokens();
      }
    });

    this.input.keyboard!.on("keydown-E", () => this.advanceCycle());
    this.input.keyboard!.on("keydown-R", () => this.resetWorld());
    this.input.keyboard!.on("keydown-SPACE", () => {
      if (this.overlayActive) {
        this.skipCycleOverlay();
      }
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, this.configureLayout, this);
    this.configureLayout();
    this.refreshScene();
  }

  update(_time: number, _delta: number): void {}

  private configureLayout = (): void => {
    const width = this.scale.width;
    const height = this.scale.height;
    const sidebarWidth = Math.max(320, Math.min(420, Math.round(width * 0.28)));
    const horizontalMargin = Math.max(32, Math.round(width * 0.04));
    const topMargin = 80;
    const bottomMargin = 80;

    this.boardArea = {
      x: horizontalMargin,
      y: topMargin,
      width: Math.max(360, width - sidebarWidth - horizontalMargin * 2 - 24),
      height: Math.max(320, height - topMargin - bottomMargin)
    };

    this.boardBg.setPosition(this.boardArea.x, this.boardArea.y);
    this.boardBg.setSize(this.boardArea.width, this.boardArea.height);

    const sidebarX = this.boardArea.x + this.boardArea.width + 24;
    this.sidebarBg.setPosition(sidebarX - 16, topMargin - 24);
    this.sidebarBg.setSize(sidebarWidth, height - topMargin + 16);

    this.cycleText.setPosition(sidebarX, topMargin - 12);
    this.triggerText.setPosition(sidebarX, topMargin + 16);
    this.dominanceLabel.setPosition(sidebarX, topMargin + 48);
    this.dominanceDesc.setPosition(sidebarX, topMargin + 72);

    const buttonStartY = topMargin + 112;
    const buttonGap = 40;
    let index = 0;
    this.viewButtons.forEach(button => {
      button.setPosition(sidebarX, buttonStartY + index * buttonGap);
      index += 1;
    });

    const feedTop = buttonStartY + buttonGap * this.viewButtons.size + 12;
    this.feedLabel.setPosition(sidebarX, feedTop);
    this.feedText.setPosition(sidebarX, feedTop + 26);

    this.warcallLabel.setPosition(sidebarX, feedTop + 180);
    this.warcallsText.setPosition(sidebarX, feedTop + 208);

    const detailTop = feedTop + 360;
    this.detailLabel.setPosition(sidebarX, detailTop);
    this.detailText.setPosition(sidebarX, detailTop + 26);

    this.controlsText.setPosition(sidebarX, height - 48);
    this.cemeteryButton.setPosition(sidebarX, height - 80);

    this.overlayBg.setSize(width, height);
    this.overlayPanel.setPosition(width / 2, height / 2);
    this.overlayTitle.setPosition(width / 2, height / 2 - 90);
    this.overlaySubtitle.setPosition(width / 2, height / 2 + 10);
    this.overlayHint.setPosition(width / 2, height / 2 + 120);

    this.cemeteryScrim.setSize(width, height);
    this.cemeteryOverlay.setPosition(width / 2, height / 2);

    this.detailText.setWordWrapWidth(sidebarWidth - 32);
    this.feedText.setWordWrapWidth(sidebarWidth - 32);
    this.warcallsText.setWordWrapWidth(sidebarWidth - 32);

    this.updateHierarchyVisuals([]);
    this.applyViewModeToTokens();
    if (this.officerTokens.size > 0) {
      this.syncOfficerTokens();
    }
  };

  private createBoardBackground(): void {
    this.boardBg = this.add.rectangle(0, 0, 100, 100, 0x101720, 0.92).setOrigin(0, 0);
    this.boardBg.setStrokeStyle(2, 0x27323f, 0.85);
    this.boardBg.setDepth(0.1);

    for (let i = 0; i < 6; i++) {
      const band = this.add.rectangle(0, 0, 100, 80, 0x111b25, 0.65).setOrigin(0, 0.5);
      band.setDepth(0.2);
      band.setVisible(false);
      this.levelBands.push(band);
      const label = this.add
        .text(0, 0, "", { fontFamily: "monospace", fontSize: "14px", color: "#93a3b8", fontStyle: "bold" })
        .setDepth(0.4)
        .setVisible(false);
      this.levelLabels.push(label);
    }
  }

  private createSidebar(): void {
    this.sidebarBg = this.add.rectangle(0, 0, 100, 100, 0x0d141a, 0.92).setOrigin(0, 0);
    this.sidebarBg.setStrokeStyle(1, 0x1f2833, 0.65);

    this.cycleText = this.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#f1f2f6"
    });

    this.triggerText = this.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cbd0d6"
    });

    this.dominanceLabel = this.add.text(0, 0, "Herrschaft", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#f1f2f6"
    });

    this.dominanceDesc = this.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#9da3ae",
      lineSpacing: 4
    });

    this.feedLabel = this.add.text(0, 0, "Welt-Feed", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#f1f2f6"
    });

    this.feedText = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d1d9e6",
        lineSpacing: 6
      })
      .setWordWrapWidth(260);

    this.warcallLabel = this.add.text(0, 0, "Aktive Warcalls", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#f1f2f6"
    });

    this.warcallsText = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d1d9e6",
        lineSpacing: 6
      })
      .setWordWrapWidth(260);

    this.detailLabel = this.add.text(0, 0, "Details", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#f1f2f6"
    });

    this.detailText = this.add
      .text(0, 0, "Fahre mit der Maus über ein Porträt oder tippe es an.", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d1d9e6",
        lineSpacing: 4
      })
      .setWordWrapWidth(260);

    this.controlsText = this.add.text(0, 0, "E: Cycle simulieren   R: Welt neu generieren   SPACE: Skip", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#9da3ae"
    });
  }

  private createViewButtons(): void {
    const modes: OfficerViewMode[] = ["ACTIVITY", "RELATIONSHIPS", "WARCALLS", "PERSONALITY", "LOYALTY"];
    modes.forEach((mode, index) => {
      const container = this.add.container(0, 0);
      const bg = this.add.rectangle(0, 0, 220, 30, 0x111b25, 0.65).setOrigin(0, 0.5);
      bg.setStrokeStyle(1, 0x1f2a33, 0.7);
      const label = this.add.text(12, 0, MODE_LABELS[mode], {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#d1d9e6"
      });
      label.setOrigin(0, 0.5);
      container.add([bg, label]);
      container.setSize(220, 32);
      container.setInteractive(new Phaser.Geom.Rectangle(0, -16, 220, 32), Phaser.Geom.Rectangle.Contains);
      container.on("pointerover", () => this.input.setDefaultCursor("pointer"));
      container.on("pointerout", () => this.input.setDefaultCursor("default"));
      container.on("pointerdown", () => this.setViewMode(mode));
      container.setDepth(1.2 + index * 0.01);
      this.viewButtons.set(mode, container);
    });
    this.updateViewButtons();
  }

  private createCycleOverlay(): void {
    this.overlayContainer = this.add.container(0, 0);
    this.overlayContainer.setDepth(50);
    this.overlayContainer.setVisible(false);

    this.overlayBg = this.add.rectangle(0, 0, 10, 10, 0x03060b, 0.78).setOrigin(0, 0);
    this.overlayBg.setInteractive({ useHandCursor: false });
    this.overlayBg.on("pointerdown", () => this.skipCycleOverlay());

    this.overlayPanel = this.add.rectangle(0, 0, 560, 320, 0x111b29, 0.95).setOrigin(0.5);
    this.overlayPanel.setStrokeStyle(1, 0x274058, 0.8);

    this.overlayTitle = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#f1f2f6",
        align: "center"
      })
      .setOrigin(0.5)
      .setWordWrapWidth(520);

    this.overlaySubtitle = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#d1d9e6",
        align: "center",
        lineSpacing: 8
      })
      .setOrigin(0.5)
      .setWordWrapWidth(520);

    this.overlayHint = this.add
      .text(0, 0, "SPACE drücken, um zu skippen", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#9da3ae"
      })
      .setOrigin(0.5, 0.5);

    this.overlayContainer.add([this.overlayBg, this.overlayPanel, this.overlayTitle, this.overlaySubtitle, this.overlayHint]);
  }

  private initializeCemetery(): void {
    this.cemeteryButton = this.add
      .text(0, 0, "Friedhof (0)", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d1d9e6",
        backgroundColor: "#162026"
      })
      .setPadding(8, 4, 10, 4)
      .setInteractive({ useHandCursor: true });
    this.cemeteryButton.on("pointerdown", () => this.toggleCemetery());

    this.cemeteryOverlay = this.add.container(0, 0);
    this.cemeteryOverlay.setDepth(40);
    this.cemeteryOverlay.setVisible(false);

    this.cemeteryScrim = this.add.rectangle(0, 0, 10, 10, 0x020205, 0.7).setOrigin(0, 0);
    this.cemeteryScrim.setInteractive({ useHandCursor: false });
    this.cemeteryScrim.on("pointerdown", () => this.closeCemetery());

    const panel = this.add.rectangle(0, 0, 360, 420, 0x111821, 0.96).setOrigin(0.5);
    panel.setStrokeStyle(1, 0x1f2a33, 0.75);

    const title = this.add
      .text(0, -180, "Friedhof", { fontFamily: "monospace", fontSize: "20px", color: "#f1f2f6" })
      .setOrigin(0.5, 0);

    this.cemeteryListText = this.add
      .text(-160, -140, "Noch keine Gefallenen.", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d1d9e6",
        lineSpacing: 6
      })
      .setOrigin(0, 0)
      .setWordWrapWidth(320);

    const close = this.add
      .text(0, 180, "Schließen", { fontFamily: "monospace", fontSize: "12px", color: "#9da3ae" })
      .setOrigin(0.5, 0.5);
    close.setInteractive({ useHandCursor: true });
    close.on("pointerdown", () => this.closeCemetery());

    this.cemeteryOverlay.add([this.cemeteryScrim, panel, title, this.cemeteryListText, close]);
  }

  private setViewMode(mode: OfficerViewMode): void {
    if (this.viewMode === mode) {
      if (mode === "RELATIONSHIPS") {
        this.selectedOfficerId = null;
      }
    } else {
      this.viewMode = mode;
      if (mode !== "RELATIONSHIPS") {
        this.selectedOfficerId = null;
      }
    }
    this.applyViewModeToTokens();
  }

  private refreshScene(summary?: CycleSummary): void {
    this.lastSummary = summary;
    this.highlightIds = collectHighlightIds(summary);
    this.updateDominanceIndicator();

    this.cycleText.setText(`Cycle ${this.world.state.cycle}`);
    const trigger = summary ? TRIGGER_LABELS[summary.trigger] ?? summary.trigger : "Start der Kampagne";
    this.triggerText.setText(`Auslöser: ${trigger}`);

    this.syncOfficerTokens(summary);
    this.refreshFeed(summary);
    this.refreshWarcalls(summary);
    this.updateCemetery();
    this.applyViewModeToTokens();
  }

  private syncOfficerTokens(summary?: CycleSummary): void {
    const fallenThisCycle = new Set<string>();
    summary?.resolved.forEach(resolution => {
      resolution.casualties.forEach(casualty => {
        if (casualty.status !== "ALIVE") {
          fallenThisCycle.add(casualty.officerId);
        }
      });
    });

    const relevant = this.world.state.officers
      .filter(officer => officer.status === "ALIVE" || fallenThisCycle.has(officer.id))
      .slice()
      .sort(compareByMerit);

    const layout = computeHierarchyLayout(relevant, this.world.state.kingId, this.boardArea);
    this.updateHierarchyVisuals(layout.levels);

    const baseScale = this.computeTokenScale(relevant.length);
    const seen = new Set<string>();
    const immediate = !summary;

    relevant.forEach(officer => {
      const position = layout.positions.get(officer.id);
      if (!position) return;
      const highlight = this.highlightIds.has(officer.id);
      const portraitKey = this.getPortraitKey(officer);

      let token = this.officerTokens.get(officer.id);
      if (!token) {
        token = new OfficerToken({
          scene: this,
          x: position.x,
          y: position.y,
          officer,
          portraitKey,
          scale: baseScale,
          highlight,
          onHover: hovered => this.showOfficerDetails(hovered),
          onBlur: () => this.clearOfficerDetails(),
          onClick: (clicked, pointer) => this.handleOfficerClick(clicked, pointer)
        });
        this.officerTokens.set(officer.id, token);
      } else {
        token.setPosition(position.x, position.y, { immediate });
      }

      token.update(officer, {
        highlight,
        scale: baseScale,
        crossed: officer.status !== "ALIVE",
        portraitKey
      });

      seen.add(officer.id);
    });

    this.officerTokens.forEach((token, id) => {
      if (!seen.has(id)) {
        token.destroy();
        this.officerTokens.delete(id);
      }
    });
  }

  private computeTokenScale(total: number): number {
    if (total <= 10) return 1.05;
    if (total <= 14) return 0.95;
    if (total <= 18) return 0.9;
    return 0.85;
  }

  private applyViewModeToTokens(): void {
    switch (this.viewMode) {
      case "RELATIONSHIPS":
        this.applyRelationshipMode();
        break;
      case "WARCALLS":
        this.applyWarcallMode();
        break;
      case "PERSONALITY":
        this.applyPersonalityMode();
        break;
      case "LOYALTY":
        this.applyLoyaltyMode();
        break;
      case "ACTIVITY":
      default:
        this.applyActivityMode();
        break;
    }
    this.updateViewButtons();
    this.updateConnections();
    if (!this.hoveredOfficerId) {
      this.detailText.setText(this.getDetailHint());
    }
  }

  private applyActivityMode(): void {
    const warcalls = this.world.state.warcalls;
    this.officerTokens.forEach((token, id) => {
      const officer = this.getOfficerById(id);
      if (!officer) return;
      const activity = describeOfficerActivity(officer, warcalls, lookupId => this.getOfficerById(lookupId));
      token.update(officer, {
        mode: "ACTIVITY",
        detailText: activity.summary,
        badgeText: null,
        dimmed: false,
        focus: null
      });
    });
  }

  private applyRelationshipMode(): void {
    const selected = this.selectedOfficerId ? this.getOfficerById(this.selectedOfficerId) : null;
    this.officerTokens.forEach((token, id) => {
      const officer = this.getOfficerById(id);
      if (!officer) return;
      if (!selected) {
        token.update(officer, {
          mode: "RELATIONSHIPS",
          detailText: "Wähle einen Offizier",
          badgeText: null,
          dimmed: true,
          focus: null
        });
        return;
      }
      const relation = this.describeRelationship(selected, officer);
      token.update(officer, {
        mode: "RELATIONSHIPS",
        detailText: relation.label,
        badgeText: relation.badge,
        badgeColor: relation.color,
        dimmed: relation.dimmed,
        focus: relation.focus
      });
    });
  }

  private applyWarcallMode(): void {
    const active = this.getActiveWarcalls();
    const involvement = this.collectWarcallInvolvements(active);
    const hasActive = active.length > 0;

    this.officerTokens.forEach((token, id) => {
      const officer = this.getOfficerById(id);
      if (!officer) return;
      const entries = involvement.get(id) ?? [];
      if (entries.length === 0) {
        token.update(officer, {
          mode: "WARCALLS",
          detailText: hasActive ? "Nicht eingeplant" : "Keine Einsätze",
          badgeText: null,
          dimmed: hasActive,
          focus: null
        });
        return;
      }

      const lines = entries.map(entry => {
        const icon = WARCALL_TYPE_ICONS[entry.warcall.type];
        return `${icon} ${entry.role}`;
      });
      const primary = entries[0];
      let badge = "?";
      let badgeColor: number = WARCALL_BADGE_COLORS.UNKNOWN;
      let focus: OfficerTokenFocus | null = null;
      if (primary.isHost) {
        badge = "♛";
        badgeColor = WARCALL_BADGE_COLORS.HOST;
        focus = "leader";
      } else if (primary.role.includes("Rivale")) {
        badge = "−";
        badgeColor = WARCALL_BADGE_COLORS.RIVAL;
        focus = "rival";
      } else if (primary.role.includes("Assassine") || primary.role.includes("verdeckt")) {
        badge = "?";
        badgeColor = WARCALL_BADGE_COLORS.HIDDEN;
        focus = "hidden";
      } else {
        badge = "+";
        badgeColor = WARCALL_BADGE_COLORS.SUPPORT;
        focus = "support";
      }

      token.update(officer, {
        mode: "WARCALLS",
        detailText: lines.join("\n"),
        badgeText: badge,
        badgeColor,
        dimmed: false,
        focus
      });
    });
  }

  private applyPersonalityMode(): void {
    this.officerTokens.forEach((token, id) => {
      const officer = this.getOfficerById(id);
      if (!officer) return;
      const plan = this.computePersonalityPlan(officer);
      let badge: string | null = null;
      let focus: OfficerTokenFocus | null = null;
      if (plan.includes("König")) {
        badge = "!";
        focus = "leader";
      } else if (plan.includes("Blut")) {
        badge = "∞";
        focus = "blood";
      }
      token.update(officer, {
        mode: "PERSONALITY",
        detailText: plan,
        badgeText: badge,
        badgeColor: 0x6c584c,
        dimmed: false,
        focus
      });
    });
  }

  private applyLoyaltyMode(): void {
    this.officerTokens.forEach((token, id) => {
      const officer = this.getOfficerById(id);
      if (!officer) return;
      const profile = this.computeLoyaltyProfile(officer);
      token.update(officer, {
        mode: "LOYALTY",
        detailText: profile.text,
        badgeText: profile.badge,
        badgeColor: profile.badgeColor,
        dimmed: profile.dimmed,
        focus: profile.focus
      });
    });
  }

  private updateConnections(): void {
    this.connections.clear();
    if (this.viewMode === "RELATIONSHIPS" && this.selectedOfficerId) {
      const selected = this.getOfficerById(this.selectedOfficerId);
      const originToken = selected ? this.officerTokens.get(selected.id) : undefined;
      if (!selected || !originToken) return;
      const origin = originToken.getPosition();
      const drawConnection = (targetId: string, color: number, width = 3): void => {
        const targetToken = this.officerTokens.get(targetId);
        if (!targetToken) return;
        const pos = targetToken.getPosition();
        this.connections.lineStyle(width, color, 0.85);
        this.connections.beginPath();
        this.connections.moveTo(origin.x, origin.y);
        this.connections.lineTo(pos.x, pos.y);
        this.connections.strokePath();
      };

      selected.relationships.friends.forEach(id => drawConnection(id, 0x2f9e44, 3));
      selected.relationships.rivals.forEach(id => drawConnection(id, 0xd00000, 3));
      if (selected.relationships.bloodOathWith) {
        drawConnection(selected.relationships.bloodOathWith, 0x3a86ff, 4);
      }
    } else if (this.viewMode === "LOYALTY") {
      const kingToken = this.officerTokens.get(this.world.state.kingId);
      if (!kingToken) return;
      const kingPos = kingToken.getPosition();
      this.world.state.officers.forEach(officer => {
        if (officer.status !== "ALIVE" || officer.id === this.world.state.kingId) return;
        const token = this.officerTokens.get(officer.id);
        if (!token) return;
        const pos = token.getPosition();
        if (officer.relationships.loyalToKing) {
          const trust = officer.personality.loyalty - officer.personality.opportunism * 0.6;
          const strength = Phaser.Math.Clamp(2 + trust * 4, 1.5, 4.5);
          const color = trust >= 0.3 ? 0x66ff99 : 0xffc857;
          this.connections.lineStyle(strength, color, 0.8);
          this.connections.beginPath();
          this.connections.moveTo(pos.x, pos.y);
          this.connections.lineTo(kingPos.x, kingPos.y);
          this.connections.strokePath();
        } else if (officer.relationships.rivals.includes(this.world.state.kingId)) {
          this.connections.lineStyle(3, 0xff5c5c, 0.8);
          this.connections.beginPath();
          this.connections.moveTo(pos.x, pos.y);
          this.connections.lineTo(kingPos.x, kingPos.y);
          this.connections.strokePath();
        }
      });
    }
  }

  private updateViewButtons(): void {
    this.viewButtons.forEach((container, mode) => {
      const bg = container.list[0] as Phaser.GameObjects.Rectangle;
      const label = container.list[1] as Phaser.GameObjects.Text;
      const active = this.viewMode === mode;
      bg.fillColor = active ? 0x1b2c3a : 0x111b25;
      bg.alpha = active ? 0.9 : 0.65;
      label.setColor(active ? "#f1f2f6" : "#d1d9e6");
    });
  }

  private getActiveWarcalls(): Warcall[] {
    return this.world.state.warcalls.filter(warcall => warcall.state !== "RESOLVED");
  }

  private collectWarcallInvolvements(warcalls: Warcall[]): Map<string, WarcallInvolvement[]> {
    const map = new Map<string, WarcallInvolvement[]>();
    warcalls.forEach(warcall => {
      const initiator = this.getOfficerById(warcall.initiator);
      const add = (id: string, role: string, isHost: boolean, hiddenRole?: string): void => {
        if (!map.has(id)) map.set(id, []);
        map.get(id)!.push({ warcall, role, isHost, hiddenRole });
      };
      add(warcall.initiator, "Ausrufer", true);
      warcall.participants.forEach(participantId => {
        const officer = this.getOfficerById(participantId);
        if (!officer) return;
        const role = resolveParticipantRole(warcall, officer, initiator ?? undefined);
        const hidden = warcall.hiddenRoles.find(entry => entry.who === participantId)?.role;
        add(participantId, hidden ? `${role} (${hidden.toLowerCase()})` : role, false, hidden);
      });
      warcall.hiddenRoles.forEach(hidden => {
        if (hidden.who === warcall.initiator) return;
        if (warcall.participants.includes(hidden.who)) return;
        const officer = this.getOfficerById(hidden.who);
        if (!officer) return;
        add(hidden.who, `Verdeckt (${hidden.role.toLowerCase()})`, false, hidden.role);
      });
    });
    return map;
  }

  private describeRelationship(selected: Officer, candidate: Officer): RelationshipDescriptor {
    if (selected.id === candidate.id) {
      return {
        label: "Zentralfigur",
        badge: "★",
        color: RELATION_BADGE_COLORS.SELF,
        focus: "leader",
        dimmed: false
      };
    }

    if (selected.relationships.bloodOathWith === candidate.id || candidate.relationships.bloodOathWith === selected.id) {
      return {
        label: "Blutschwur",
        badge: "∞",
        color: RELATION_BADGE_COLORS.BLOOD,
        focus: "blood",
        dimmed: false
      };
    }

    if (selected.relationships.friends.includes(candidate.id)) {
      return {
        label: "Verbündeter",
        badge: "+",
        color: RELATION_BADGE_COLORS.ALLY,
        focus: "ally",
        dimmed: false
      };
    }

    if (selected.relationships.rivals.includes(candidate.id)) {
      return {
        label: "Rivale",
        badge: "−",
        color: RELATION_BADGE_COLORS.RIVAL,
        focus: "rival",
        dimmed: false
      };
    }

    return {
      label: "Neutral",
      badge: null,
      color: RELATION_BADGE_COLORS.NEUTRAL,
      focus: null,
      dimmed: true
    };
  }

  private computePersonalityPlan(officer: Officer): string {
    const { ambition, aggression, loyalty, opportunism } = officer.personality;
    if (officer.rank === "König") {
      return "Will seine Herrschaft festigen.";
    }
    if (officer.rank === "Herausforderer" || ambition > 0.82) {
      return "Will den Thron erobern.";
    }
    if (officer.traits.includes("Berserker") && aggression > 0.7) {
      return "Sehnt sich nach brutalen Duellen.";
    }
    if (officer.traits.includes("Tierbaendiger")) {
      return "Will ein legendäres Biest erlegen.";
    }
    if (loyalty > 0.75 && officer.relationships.loyalToKing) {
      return "Will Blutbruder des Königs werden.";
    }
    if (opportunism > 0.65) {
      return "Schmiedet Pläne für einen Verrat.";
    }
    if (aggression > 0.6) {
      return "Sucht Ruhm auf dem Schlachtfeld.";
    }
    if (ambition > 0.6) {
      return "Will zu den Captains aufsteigen.";
    }
    if (officer.traits.includes("Diplomat")) {
      return "Will ein Netz aus Verbündeten knüpfen.";
    }
    if (officer.traits.includes("GraueEminenz")) {
      return "Spinnt Intrigen im Schatten.";
    }
    return "Will Merit sammeln und Ausrüstung verbessern.";
  }

  private computeLoyaltyProfile(officer: Officer): LoyaltyProfile {
    if (officer.id === this.world.state.kingId) {
      return {
        text: "Zentrum der Macht",
        badge: "♛",
        badgeColor: 0x8d3f88,
        focus: "leader",
        dimmed: false
      };
    }

    const loyalty = officer.personality.loyalty;
    const opportunism = officer.personality.opportunism;
    const trust = loyalty - opportunism * 0.6;
    const trustLabel = trust >= 0.35 ? "verlässlich" : trust <= 0 ? "gefährlich" : "wankel";

    if (officer.relationships.loyalToKing) {
      return {
        text: `Treue zum König (${trustLabel})`,
        badge: trust >= 0.35 ? "★" : "?",
        badgeColor: trust >= 0.35 ? 0x2f9e44 : 0xffc857,
        focus: trust >= 0.35 ? "support" : "hidden",
        dimmed: false
      };
    }

    if (officer.relationships.bloodOathWith) {
      const partner = this.getOfficerById(officer.relationships.bloodOathWith);
      const partnerName = partner ? shortName(partner.name) : "?";
      return {
        text: `Blutbruder von ${partnerName} (${trustLabel})`,
        badge: "∞",
        badgeColor: 0x3a86ff,
        focus: "blood",
        dimmed: false
      };
    }

    if (officer.relationships.rivals.includes(this.world.state.kingId)) {
      return {
        text: "Rivale der Krone",
        badge: "!",
        badgeColor: 0xd00000,
        focus: "rival",
        dimmed: false
      };
    }

    if (loyalty > 0.6) {
      return {
        text: "Sucht einen würdigen Anführer",
        badge: null,
        badgeColor: 0x111b25,
        focus: null,
        dimmed: false
      };
    }

    return {
      text: "Hält sich aus Loyalitäten heraus",
      badge: null,
      badgeColor: 0x111b25,
      focus: null,
      dimmed: true
    };
  }

  private getDetailHint(): string {
    switch (this.viewMode) {
      case "RELATIONSHIPS":
        return this.selectedOfficerId
          ? "Beziehungen des markierten Offiziers."
          : "Wähle einen Offizier, um Beziehungen zu sehen.";
      case "WARCALLS":
        return "Wähle ein Porträt für Missionsrollen.";
      case "PERSONALITY":
        return "Persönliche Langzeitpläne der Offiziere.";
      case "LOYALTY":
        return "Loyalität und Vertrauenswürdigkeit der Offiziere.";
      case "ACTIVITY":
      default:
        return "Fahre mit der Maus über ein Porträt oder tippe es an.";
    }
  }

  private handleOfficerClick(officer: Officer, _pointer: Phaser.Input.Pointer): void {
    if (this.viewMode === "RELATIONSHIPS") {
      this.selectedOfficerId = this.selectedOfficerId === officer.id ? null : officer.id;
      this.applyViewModeToTokens();
    }
  }

  private showOfficerDetails(officer: Officer): void {
    this.hoveredOfficerId = officer.id;
    const traits = officer.traits.slice(0, 2).join(", ") || "Keine";
    const activity = describeOfficerActivity(officer, this.world.state.warcalls, id => this.getOfficerById(id));
    const loyalty = Math.round(officer.personality.loyalty * 100);
    const opportunism = Math.round(officer.personality.opportunism * 100);
    const lines = [
      `${officer.name} — ${officer.rank} (Lv ${officer.level})`,
      `Clan ${officer.clan} · Merit ${officer.merit}`,
      `Traits: ${traits}`,
      `Aktivität: ${activity.summary}`,
      `Loyalität ${loyalty}% · Opportunismus ${opportunism}%`
    ];
    if (activity.role) {
      lines.push(`Rolle: ${activity.role}`);
    }
    this.detailText.setText(lines.join("\n"));
  }

  private clearOfficerDetails(): void {
    this.hoveredOfficerId = null;
    this.detailText.setText(this.getDetailHint());
  }

  private updateHierarchyVisuals(levels: HierarchyLevel[]): void {
    levels.forEach((level, index) => {
      if (!this.levelBands[index]) return;
      const band = this.levelBands[index];
      const label = this.levelLabels[index];
      const height = Math.max(70, level.bottom - level.top - 6);
      band.setVisible(true);
      band.setPosition(this.boardArea.x, level.top + height / 2);
      band.setSize(this.boardArea.width, height);
      const fill = index % 2 === 0 ? 0x101a24 : 0x0d141d;
      band.setFillStyle(fill, 0.72);
      band.setStrokeStyle(1, 0x1f2d3a, 0.6);
      label.setVisible(true);
      label.setPosition(this.boardArea.x + 12, level.top + 10);
      label.setText(level.label.toUpperCase());
    });
    for (let i = levels.length; i < this.levelBands.length; i++) {
      this.levelBands[i].setVisible(false);
      this.levelLabels[i].setVisible(false);
    }
  }

  private refreshFeed(summary?: CycleSummary): void {
    const newIds = new Set(summary?.feed.map(entry => entry.id) ?? []);
    const latest = this.world.state.feed.slice(-6);
    if (latest.length === 0) {
      this.feedText.setText("Keine Meldungen – starte einen Warcall!");
      return;
    }
    const lines = latest.map(entry => {
      const marker = newIds.has(entry.id) ? "»" : "•";
      return `${marker} [${entry.cycle}] ${entry.text}`;
    });
    this.feedText.setText(lines.join("\n\n"));
  }

  private refreshWarcalls(summary?: CycleSummary): void {
    const active = this.getActiveWarcalls();
    if (active.length === 0) {
      this.warcallsText.setText("Keine aktiven Warcalls.");
      return;
    }
    const highlights = new Set(summary?.newWarcalls.map(w => w.id) ?? []);
    const lines = active.map(warcall => {
      const icon = WARCALL_TYPE_ICONS[warcall.type];
      const label = WARCALL_TYPE_LABELS[warcall.type];
      const initiator = shortName(this.getOfficerById(warcall.initiator)?.name ?? "Unbekannt");
      const roster = [warcall.initiator, ...warcall.participants]
        .map(id => shortName(this.getOfficerById(id)?.name ?? "?"))
        .join(", ");
      const chance = Math.round(this.computeWarcallSuccess(warcall) * 100);
      const marker = highlights.has(warcall.id) ? "★" : "•";
      return `${marker} ${icon} ${label} – ${initiator} (${chance}% Erfolg)\n   Teilnehmer: ${roster}`;
    });
    this.warcallsText.setText(lines.join("\n\n"));
  }

  private computeWarcallSuccess(warcall: Warcall): number {
    return estimateWarcallSuccess(this.world.state, warcall);
  }

  private updateDominanceIndicator(): void {
    const state = this.computeDominanceState();
    this.dominanceLabel.setText(`Herrschaft: ${state.label}`);
    this.dominanceLabel.setColor(state.stable ? "#8cffc1" : "#ff6b6b");
    this.dominanceDesc.setText(state.description);
  }

  private computeDominanceState(): { label: string; description: string; stable: boolean } {
    const alive = this.world.state.officers.filter(officer => officer.status === "ALIVE");
    if (alive.length === 0) {
      return { label: "Unbekannt", description: "Keine Offiziere am Leben.", stable: false };
    }
    const loyaltyAvg = alive.reduce((sum, officer) => sum + officer.personality.loyalty, 0) / alive.length;
    const ambitionAvg = alive.reduce((sum, officer) => sum + officer.personality.ambition, 0) / alive.length;
    const challengers = alive.filter(officer => officer.rank === "Herausforderer").length;
    const king = this.getOfficerById(this.world.state.kingId);
    const rivals = king
      ? alive.filter(officer => officer.relationships.rivals.includes(king.id)).length
      : 0;
    const score = loyaltyAvg - ambitionAvg * 0.35 - challengers * 0.04 - rivals * 0.08;
    const stable = score >= 0.05;
    const description = stable
      ? "Die Clans stehen hinter dem König."
      : "Intrigen und Zweifel schwächen die Herrschaft.";
    return { label: stable ? "GEFESTIGT" : "UNGEFESTIGT", description, stable };
  }

  private advanceCycle(): void {
    if (this.overlayActive) {
      this.skipCycleOverlay();
      return;
    }
    const summary = this.world.runCycle();
    this.refreshScene(summary);
    this.showCycleSummary(summary);
  }

  private resetWorld(): void {
    if (this.overlayActive) {
      this.skipCycleOverlay();
    }
    this.officerTokens.forEach(token => token.destroy());
    this.officerTokens.clear();
    this.selectedOfficerId = null;
    this.hoveredOfficerId = null;
    this.world = new World({ seed: Date.now() });
    this.refreshScene();
  }

  private showCycleSummary(summary: CycleSummary): void {
    const events = this.buildCycleEvents(summary);
    if (events.length === 0) {
      this.playTone(420, 0.2, "triangle");
      return;
    }
    this.overlayQueue = events;
    this.overlayActive = true;
    this.overlayContainer.setVisible(true);
    this.overlayContainer.setAlpha(0);
    this.tweens.add({
      targets: this.overlayContainer,
      alpha: 1,
      duration: 220,
      ease: Phaser.Math.Easing.Cubic.Out,
      onComplete: () => this.playNextCinematicEvent()
    });
  }

  private playNextCinematicEvent(): void {
    if (!this.overlayActive) return;
    const event = this.overlayQueue.shift();
    if (!event) {
      this.hideCycleOverlay();
      return;
    }

    this.overlayTitle.setText(event.title);
    this.overlaySubtitle.setText(event.description);
    this.overlayTitle.setAlpha(0);
    this.overlaySubtitle.setAlpha(0);

    this.tweens.add({
      targets: [this.overlayTitle, this.overlaySubtitle],
      alpha: 1,
      duration: 240,
      ease: Phaser.Math.Easing.Cubic.Out
    });

    const tone = event.tone ?? EVENT_TONES[event.kind];
    this.playTone(tone, event.kind === "DEATH" ? 0.5 : 0.3, event.kind === "DEATH" ? "sawtooth" : "triangle");
    this.applyCinematicEventEffects(event);

    const duration = event.duration ?? 1900;
    this.overlayTimer?.remove();
    this.overlayTimer = this.time.delayedCall(duration, () => this.playNextCinematicEvent());
  }

  private applyCinematicEventEffects(event: CinematicEvent): void {
    switch (event.kind) {
      case "PROMOTION":
      case "DEMOTION": {
        const token = event.officerId ? this.officerTokens.get(event.officerId) : undefined;
        if (token) {
          token.flash(event.kind === "PROMOTION" ? 0x8cffc1 : 0xff6b6b, 520);
        }
        break;
      }
      case "DEATH": {
        const token = event.officerId ? this.officerTokens.get(event.officerId) : undefined;
        token?.markFallen();
        break;
      }
      case "WARCALL":
      case "PURGE": {
        const resolution = event.warcallId
          ? this.lastSummary?.resolved.find(res => res.warcall.id === event.warcallId)
          : undefined;
        if (resolution) {
          const highlight = new Set([
            resolution.warcall.initiator,
            ...resolution.warcall.participants,
            ...resolution.victorious,
            ...resolution.defeated
          ]);
          highlight.forEach(id => {
            const token = this.officerTokens.get(id);
            token?.flash(event.kind === "PURGE" ? 0xffc857 : 0x6ab04c, 520);
          });
          resolution.casualties.forEach(casualty => {
            const token = this.officerTokens.get(casualty.officerId);
            token?.markFallen();
          });
        }
        break;
      }
      case "REPLACEMENT": {
        const token = event.officerId ? this.officerTokens.get(event.officerId) : undefined;
        token?.flash(0x6dc2ff, 520);
        break;
      }
      default:
        break;
    }
  }

  private hideCycleOverlay(): void {
    this.overlayTimer?.remove();
    this.overlayTimer = undefined;
    this.overlayActive = false;
    this.tweens.add({
      targets: this.overlayContainer,
      alpha: 0,
      duration: 220,
      ease: Phaser.Math.Easing.Cubic.In,
      onComplete: () => {
        this.overlayContainer.setVisible(false);
      }
    });
  }

  private skipCycleOverlay(): void {
    if (!this.overlayActive) return;
    this.overlayQueue = [];
    this.hideCycleOverlay();
  }

  private buildCycleEvents(summary: CycleSummary): CinematicEvent[] {
    const events: CinematicEvent[] = [];
    const toName = (id: string): string => this.getOfficerById(id)?.name ?? "Unbekannt";

    summary.hierarchyChanges.forEach(change => {
      const officer = this.getOfficerById(change.officerId);
      if (!officer) return;
      const promoted = rankValue(change.to) > rankValue(change.from);
      events.push({
        kind: promoted ? "PROMOTION" : "DEMOTION",
        officerId: officer.id,
        title: promoted
          ? `${officer.name} steigt zum ${change.to} auf`
          : `${officer.name} fällt zum ${change.to} zurück`,
        description: promoted
          ? `${officer.name.split(" ")[0]} erringt mehr Einfluss.`
          : `Verliert Ansehen innerhalb der Hierarchie.`,
        tone: promoted ? 640 : 280
      });
    });

    summary.resolved.forEach(resolution => {
      const { warcall } = resolution;
      const initiator = toName(warcall.initiator);
      const label = WARCALL_TYPE_LABELS[warcall.type];
      const victorious = resolution.victorious.map(id => shortName(toName(id))).join(", ");
      const defeated = resolution.defeated.map(id => shortName(toName(id))).join(", ");
      const descriptionParts = [] as string[];
      if (victorious) descriptionParts.push(`Sieg für ${victorious}.`);
      if (defeated) descriptionParts.push(`Niederlage für ${defeated}.`);
      const casualties = resolution.casualties.filter(c => c.status !== "ALIVE");
      if (casualties.length > 0) {
        const names = casualties.map(c => shortName(toName(c.officerId))).join(", ");
        descriptionParts.push(`Verluste: ${names}.`);
      }
      events.push({
        kind: warcall.type === "PURGE" ? "PURGE" : "WARCALL",
        warcallId: warcall.id,
        title: `${WARCALL_TYPE_ICONS[warcall.type]} ${label} – ${initiator}`,
        description: descriptionParts.join(" ") || "Ausgang noch unklar.",
        tone: warcall.type === "PURGE" ? 160 : 440,
        duration: warcall.type === "PURGE" ? 2400 : 2000
      });

      casualties.forEach(casualty => {
        events.push({
          kind: "DEATH",
          officerId: casualty.officerId,
          title: `${toName(casualty.officerId)} fällt`,
          description:
            casualty.reason === "BLOOD_OATH"
              ? "Blutopfer während des Eides."
              : `Gefallen während ${label.toLowerCase()} in ${warcall.location}.`,
          tone: 160,
          duration: 2100
        });
      });
    });

    summary.replacements.forEach(replacement => {
      events.push({
        kind: "REPLACEMENT",
        officerId: replacement.id,
        title: `${replacement.name} tritt der Hierarchie bei`,
        description: `${replacement.rank} aus dem Clan ${replacement.clan} ersetzt einen Gefallenen.`,
        tone: 520
      });
    });

    return events;
  }

  private playTone(frequency: number, duration = 0.3, type: OscillatorType = "triangle"): void {
    if (!(this.sound instanceof Phaser.Sound.WebAudioSoundManager)) {
      return;
    }
    const context = this.sound.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(context.destination);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private updateCemetery(): void {
    const fallen = this.world.state.officers.filter(officer => officer.status !== "ALIVE");
    this.cemeteryButton.setText(`Friedhof (${fallen.length})`);
    if (fallen.length === 0) {
      this.cemeteryListText.setText("Noch keine Gefallenen.");
      return;
    }
    const lines = fallen
      .slice()
      .sort(compareByMerit)
      .map(officer => {
        const status = officer.status === "MISSING" ? "Vermisst" : "Gefallen";
        return `• ${officer.name} (${officer.rank}, Lv ${officer.level}) – ${status}`;
      });
    this.cemeteryListText.setText(lines.join("\n\n"));
  }

  private toggleCemetery(): void {
    if (this.cemeteryOverlay.visible) {
      this.closeCemetery();
    } else {
      this.openCemetery();
    }
  }

  private openCemetery(): void {
    this.cemeteryOverlay.setVisible(true);
    this.cemeteryOverlay.setAlpha(0);
    this.tweens.add({
      targets: this.cemeteryOverlay,
      alpha: 1,
      duration: 200,
      ease: Phaser.Math.Easing.Cubic.Out
    });
  }

  private closeCemetery(): void {
    this.tweens.add({
      targets: this.cemeteryOverlay,
      alpha: 0,
      duration: 200,
      ease: Phaser.Math.Easing.Cubic.In,
      onComplete: () => this.cemeteryOverlay.setVisible(false)
    });
  }

  private getOfficerById(id: string): Officer | undefined {
    return this.world.state.officers.find(officer => officer.id === id);
  }

  private getPortraitKey(officer: Officer): string {
    const cached = this.officerPortraitMap.get(officer.id);
    if (cached) return cached;
    const index = portraitIndexForId(officer.id);
    const key = this.portraitKeys[index] ?? this.portraitKeys[0];
    this.officerPortraitMap.set(officer.id, key);
    return key;
  }
}
