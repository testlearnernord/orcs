import { getPhaser } from "@game/phaserRuntime";
import { OfficerToken } from "@game/ui/OfficerToken";
import { describeOfficerActivity } from "@game/ui/activity";
import { collectHighlightIds } from "@game/ui/highlights";
import { computeOfficerPositions, createAdaptiveGridConfig, type BoardArea } from "@game/ui/layout";
import { WARCALL_TYPE_GOALS, WARCALL_TYPE_ICONS, WARCALL_TYPE_LABELS, resolveParticipantRole } from "@game/ui/warcallUi";
import { estimateWarcallSuccess } from "@sim/insights";
import type { CycleSummary, CycleTrigger, Officer, Warcall } from "@sim/types";
import { World } from "@sim/world";

const Phaser = getPhaser();

const TRIGGER_LABELS: Record<CycleTrigger, string> = {
  WARCALL_COMPLETED: "Warcall abgeschlossen",
  FREE_ROAM_TIMEOUT: "Freies Spiel (Timeout)",
  OFFICER_DEATH: "Offizier gefallen",
  DEBUG: "Debug"
};

function shortLabel(name: string): string {
  const trimmed = name.split(" ")[0] ?? name;
  return trimmed.length > 10 ? `${trimmed.slice(0, 9)}…` : trimmed;
}

export default class PlayScene extends Phaser.Scene {
  private world!: World;
  private officerTokens = new Map<string, OfficerToken>();
  private cycleText!: Phaser.GameObjects.Text;
  private triggerText!: Phaser.GameObjects.Text;
  private feedLabel!: Phaser.GameObjects.Text;
  private feedText!: Phaser.GameObjects.Text;
  private warcallLabel!: Phaser.GameObjects.Text;
  private warcallsText!: Phaser.GameObjects.Text;
  private detailLabel!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private boardBg!: Phaser.GameObjects.Rectangle;
  private sidebarBg!: Phaser.GameObjects.Rectangle;
  private connections!: Phaser.GameObjects.Graphics;
  private cemeteryButton!: Phaser.GameObjects.Container;
  private cemeteryButtonBg!: Phaser.GameObjects.Rectangle;
  private cemeteryLabel!: Phaser.GameObjects.Text;
  private cemeteryCount!: Phaser.GameObjects.Text;
  private cemeteryOverlay!: Phaser.GameObjects.Container;
  private cemeteryScrim!: Phaser.GameObjects.Rectangle;
  private cemeteryOverlayBg!: Phaser.GameObjects.Rectangle;
  private cemeteryOverlayTitle!: Phaser.GameObjects.Text;
  private cemeteryOverlayList!: Phaser.GameObjects.Text;
  private cemeteryOverlayClose!: Phaser.GameObjects.Text;
  private warcallIconBar!: Phaser.GameObjects.Container;
  private warcallIconBarBg!: Phaser.GameObjects.Rectangle;
  private warcallIcons = new Map<string, Phaser.GameObjects.Container>();
  private warcallIconMeta = new Map<
    string,
    { bg: Phaser.GameObjects.Rectangle; icon: Phaser.GameObjects.Text; label: Phaser.GameObjects.Text; chance: Phaser.GameObjects.Text }
  >();
  private boardArea: BoardArea = { x: 120, y: 120, width: 620, height: 500 };
  private sidebarArea: BoardArea = { x: 660, y: 36, width: 280, height: 520 };
  private sidebarPadding = 24;
  private highlightIds: Set<string> = new Set();
  private focusHighlightIds: Set<string> = new Set();
  private focusedWarcallId: string | null = null;
  private detailMode: "DEFAULT" | "OFFICER" | "WARCALL" = "DEFAULT";
  private lastSummary?: CycleSummary;
  private readonly defaultDetailMessage = "Fahre mit der Maus über ein Porträt oder tippe es an.";

  constructor() {
    super("Play");
  }

  create() {
    this.world = new World({ seed: Date.now() });

    this.boardBg = this.add.rectangle(0, 0, 10, 10, 0x101720, 0.92).setOrigin(0, 0);
    this.boardBg.setStrokeStyle(2, 0x27323f, 0.85);
    this.boardBg.setInteractive({ useHandCursor: false });
    this.boardBg.on("pointerdown", () => {
      this.clearWarcallSelection();
    });

    this.sidebarBg = this.add.rectangle(0, 0, 10, 10, 0x0d141a, 0.92).setOrigin(0, 0);
    this.sidebarBg.setStrokeStyle(1, 0x1f2833, 0.6);

    this.connections = this.add.graphics();
    this.connections.setDepth(0.5);

    this.cycleText = this.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#f1f2f6"
    });

    this.triggerText = this.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cbd0d6"
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
      .setWordWrapWidth(240);

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
      .setWordWrapWidth(240);

    this.detailLabel = this.add.text(0, 0, "Details", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#f1f2f6"
    });

    this.detailText = this.add
      .text(0, 0, this.defaultDetailMessage, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d1d9e6",
        lineSpacing: 4
      })
      .setWordWrapWidth(240);

    this.controlsText = this.add.text(0, 0, "E: Cycle simulieren   R: Welt neu generieren", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#9da3ae"
    });

    this.initializeWarcallIconBar();
    this.initializeCemeteryUI();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.configureLayout, this);

    this.configureLayout();
    this.refreshScene();

    this.input.keyboard!.on("keydown-E", () => this.advanceCycle());
    this.input.keyboard!.on("keydown-R", () => this.resetWorld());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.officerTokens.forEach(token => token.destroy());
      this.officerTokens.clear();
      this.warcallIcons.forEach(icon => icon.destroy(true));
      this.warcallIcons.clear();
      this.warcallIconMeta.clear();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.configureLayout, this);
      this.boardBg.off("pointerdown");
    });
  }

  update(_t: number, _d: number) {}

  private advanceCycle(): void {
    const summary = this.world.runCycle();
    this.refreshScene(summary);
  }

  private resetWorld(): void {
    this.officerTokens.forEach(token => token.destroy());
    this.officerTokens.clear();
    this.warcallIcons.forEach(icon => icon.destroy(true));
    this.warcallIcons.clear();
    this.warcallIconMeta.clear();
    this.focusHighlightIds.clear();
    this.focusedWarcallId = null;
    this.showDefaultDetails();
    this.hideCemeteryOverlay();
    this.world = new World({ seed: Date.now() });
    this.refreshScene();
  }

  private refreshScene(summary?: CycleSummary): void {
    this.lastSummary = summary;
    this.highlightIds = collectHighlightIds(summary);
    this.validateWarcallFocus();
    this.cycleText.setText(`Cycle ${this.world.state.cycle}`);
    const trigger = summary ? this.formatTrigger(summary.trigger) : "Start der Kampagne";
    this.triggerText.setText(`Auslöser: ${trigger}`);

    this.syncOfficerTokens(summary);
    this.refreshFeed(summary);
    this.refreshWarcalls(summary);
    this.drawConnections(summary);
    this.syncWarcallIcons(summary);
    this.updateCemeteryUI();
    this.updateSidebarFlow();
  }

  private formatTrigger(trigger: CycleTrigger): string {
    return TRIGGER_LABELS[trigger] ?? trigger;
  }

  private syncOfficerTokens(summary?: CycleSummary): void {
    const highlightIds = new Set(this.highlightIds);
    this.focusHighlightIds.forEach(id => highlightIds.add(id));

    const alive = this.world.state.officers.filter(officer => officer.status === "ALIVE");
    const total = alive.length;
    const config = createAdaptiveGridConfig(this.boardArea, total);
    const positions = computeOfficerPositions(total, config);
    const seen = new Set<string>();
    const immediate = !summary;

    alive.forEach((officer, index) => {
      const position = positions[index];
      const highlight = highlightIds.has(officer.id);
      let token = this.officerTokens.get(officer.id);
      if (!token) {
        token = new OfficerToken({
          scene: this,
          x: position.x,
          y: position.y,
          officer,
          highlight,
          onHover: hovered => this.showOfficerDetails(hovered),
          onBlur: () => this.clearOfficerDetails()
        });
        this.officerTokens.set(officer.id, token);
      } else {
        token.setPosition(position.x, position.y, { immediate });
        token.update(officer, { highlight });
      }
      seen.add(officer.id);
    });

    this.officerTokens.forEach((token, id) => {
      if (!seen.has(id)) {
        token.destroy();
        this.officerTokens.delete(id);
      }
    });
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
    const active = this.world.state.warcalls.filter(w => w.state !== "RESOLVED");
    if (active.length === 0) {
      this.warcallsText.setText("Keine aktiven Warcalls.");
      return;
    }

    const highlights = new Set(summary?.newWarcalls.map(w => w.id) ?? []);
    const lines = active.map(warcall => this.describeWarcall(warcall, highlights.has(warcall.id)));
    this.warcallsText.setText(lines.join("\n\n"));
  }

  private describeWarcall(warcall: Warcall, highlight: boolean): string {
    const selected = this.focusedWarcallId === warcall.id;
    const marker = selected ? "★" : highlight ? "»" : "•";
    const icon = WARCALL_TYPE_ICONS[warcall.type];
    const label = WARCALL_TYPE_LABELS[warcall.type];
    const roster = this.collectParticipantIds(warcall)
      .map(id => this.getOfficerShortName(id))
      .join(", ");
    const chance = Math.round(this.computeWarcallSuccess(warcall) * 100);
    return (
      `${marker} ${icon} ${label} @ ${warcall.location}\n` +
      `   Erfolg: ${chance}% für ${this.getOfficerShortName(warcall.initiator)}\n` +
      `   ${roster}`
    );
  }

  private drawConnections(summary?: CycleSummary): void {
    this.connections.clear();

    const draw = (warcall: Warcall, color: number, alpha: number, width: number) => {
      const source = this.officerTokens.get(warcall.initiator);
      if (!source) return;
      const start = source.getPosition();
      warcall.participants.forEach(participant => {
        const target = this.officerTokens.get(participant);
        if (!target) return;
        const end = target.getPosition();
        this.connections.lineStyle(width, color, alpha);
        this.connections.strokeLineShape(new Phaser.Geom.Line(start.x, start.y, end.x, end.y));
      });
    };

    const active = this.world.state.warcalls.filter(w => w.state !== "RESOLVED");
    active.forEach(warcall => draw(warcall, 0x4cc9f0, 0.35, 2));

    if (summary) {
      summary.newWarcalls.forEach(warcall => draw(warcall, 0xf6bd60, 0.65, 3));
      summary.resolved.forEach(resolution => draw(resolution.warcall, 0xef476f, 0.55, 3));
    }

    if (this.focusedWarcallId) {
      const focused = this.world.state.warcalls.find(
        warcall => warcall.id === this.focusedWarcallId && warcall.state !== "RESOLVED"
      );
      if (focused) {
        draw(focused, 0xf6bd60, 0.9, 4);
      }
    }
  }

  private configureLayout(): void {
    const width = Math.max(this.scale.gameSize.width, 1);
    const height = Math.max(this.scale.gameSize.height, 1);
    const padding = Math.max(24, Math.round(Math.min(width, height) * 0.04));

    this.cycleText.setPosition(padding, padding);
    this.triggerText.setPosition(padding, padding + 28);

    this.controlsText.setPosition(padding, height - padding - this.controlsText.height);

    const availableWidth = Math.max(width - padding * 3, 0);
    let boardWidth = Math.min(Math.max(availableWidth * 0.64, 0), availableWidth);
    let sidebarWidth = availableWidth - boardWidth;
    if (availableWidth > 0) {
      const minSidebar = Math.min(Math.max(220, availableWidth * 0.28), availableWidth);
      if (sidebarWidth < minSidebar) {
        sidebarWidth = minSidebar;
        boardWidth = availableWidth - sidebarWidth;
      }
      const minBoard = Math.min(Math.max(320, availableWidth * 0.55), availableWidth);
      if (boardWidth < minBoard) {
        boardWidth = minBoard;
        sidebarWidth = availableWidth - boardWidth;
      }
    }

    const boardTop = padding + 72;
    const controlsTop = this.controlsText.y;
    const boardBottom = Math.max(boardTop + 220, controlsTop - 16);
    let boardHeight = Math.max(320, boardBottom - boardTop);
    if (boardHeight > boardBottom - boardTop) {
      boardHeight = boardBottom - boardTop;
    }
    const boardX = padding;
    const boardY = Math.max(boardTop, boardBottom - boardHeight);

    this.boardBg.setPosition(boardX, boardY);
    this.boardBg.setDisplaySize(boardWidth, boardHeight);

    const sidebarX = boardX + boardWidth + padding;
    const sidebarHeight = Math.max(200, height - padding * 2);
    this.sidebarBg.setPosition(sidebarX, padding);
    this.sidebarBg.setDisplaySize(sidebarWidth, sidebarHeight);

    let iconBarHeight = Math.min(110, Math.max(72, Math.round(boardHeight * 0.22)));
    let tokenAreaHeight = boardHeight - iconBarHeight - 32;
    if (tokenAreaHeight < 180) {
      const adjustment = 180 - tokenAreaHeight;
      iconBarHeight = Math.max(60, iconBarHeight - adjustment);
      tokenAreaHeight = boardHeight - iconBarHeight - 32;
    }
    if (tokenAreaHeight < 160) {
      tokenAreaHeight = Math.max(140, Math.round(boardHeight * 0.65));
      iconBarHeight = Math.max(60, boardHeight - tokenAreaHeight - 20);
    }

    const iconBarY = boardY + boardHeight - iconBarHeight;
    this.warcallIconBar.setPosition(boardX, iconBarY);
    this.warcallIconBarBg.setDisplaySize(boardWidth, iconBarHeight);
    this.layoutWarcallIcons();

    this.boardArea = { x: boardX, y: boardY, width: boardWidth, height: Math.max(160, tokenAreaHeight) };
    this.sidebarArea = { x: sidebarX, y: padding, width: sidebarWidth, height: sidebarHeight };
    this.sidebarPadding = Math.max(20, Math.round(sidebarWidth * 0.08));

    const buttonWidth = this.cemeteryButtonBg.displayWidth;
    const buttonHeight = this.cemeteryButtonBg.displayHeight;
    let buttonY = boardY - buttonHeight - 12;
    if (buttonY < padding) {
      buttonY = boardY + 12;
    }
    const buttonX = boardX + boardWidth - buttonWidth - 16;
    this.cemeteryButton.setPosition(buttonX, buttonY);

    this.cemeteryScrim.setDisplaySize(width, height);
    const overlayWidth = Math.min(Math.max(320, boardWidth * 0.7), Math.max(320, width - padding * 2));
    const overlayHeight = Math.min(Math.max(280, boardHeight * 0.8), Math.max(260, height - padding * 2));
    this.cemeteryOverlayBg.setDisplaySize(overlayWidth, overlayHeight);
    this.cemeteryOverlayBg.setPosition(width / 2, height / 2);
    this.cemeteryOverlayTitle.setPosition(width / 2, height / 2 - overlayHeight / 2 + 24);
    this.cemeteryOverlayList.setPosition(
      width / 2 - overlayWidth / 2 + 24,
      this.cemeteryOverlayTitle.y + this.cemeteryOverlayTitle.height + 12
    );
    this.cemeteryOverlayList.setWordWrapWidth(overlayWidth - 48);
    this.cemeteryOverlayList.setFixedSize(overlayWidth - 48, overlayHeight - 120);
    this.cemeteryOverlayClose.setPosition(width / 2, height / 2 + overlayHeight / 2 - 28);

    this.reflowOfficerPositions();
    this.drawConnections();
    this.updateSidebarFlow();
    this.layoutWarcallIcons();
  }

  private reflowOfficerPositions(): void {
    if (!this.world || this.officerTokens.size === 0) {
      return;
    }
    const alive = this.world.state.officers.filter(officer => officer.status === "ALIVE");
    const total = alive.length;
    const config = createAdaptiveGridConfig(this.boardArea, total);
    const positions = computeOfficerPositions(total, config);
    alive.forEach((officer, index) => {
      const token = this.officerTokens.get(officer.id);
      if (token) {
        token.setPosition(positions[index].x, positions[index].y, { immediate: true });
      }
    });
  }

  private updateSidebarFlow(): void {
    if (this.sidebarArea.width <= 0 || this.sidebarArea.height <= 0) {
      return;
    }
    const labelX = this.sidebarArea.x + this.sidebarPadding;
    const top = this.sidebarArea.y + this.sidebarPadding;
    const wrapWidth = Math.max(160, this.sidebarArea.width - this.sidebarPadding * 2);

    this.feedLabel.setPosition(labelX, top);
    this.feedText.setPosition(labelX, this.feedLabel.y + this.feedLabel.height + 6);
    this.feedText.setWordWrapWidth(wrapWidth);

    const feedBounds = this.feedText.getBounds();
    let nextY = feedBounds.bottom + 24;

    this.warcallLabel.setPosition(labelX, nextY);
    this.warcallsText.setPosition(labelX, this.warcallLabel.y + this.warcallLabel.height + 6);
    this.warcallsText.setWordWrapWidth(wrapWidth);

    const warcallBounds = this.warcallsText.getBounds();
    nextY = warcallBounds.bottom + 24;

    const detailMaxBottom = this.sidebarArea.y + this.sidebarArea.height - this.sidebarPadding;
    if (nextY + this.detailLabel.height + 6 > detailMaxBottom) {
      nextY = Math.max(top, detailMaxBottom - (this.detailLabel.height + 6));
    }

    this.detailLabel.setPosition(labelX, nextY);
    const detailTextY = this.detailLabel.y + this.detailLabel.height + 6;
    this.detailText.setPosition(labelX, detailTextY);
    const detailHeight = Math.max(0, detailMaxBottom - detailTextY);
    this.detailText.setWordWrapWidth(wrapWidth);
    this.detailText.setFixedSize(wrapWidth, detailHeight);
  }

  private showOfficerDetails(officer: Officer): void {
    this.detailMode = "OFFICER";
    this.detailLabel.setText("Details – Offizier");

    const traits = officer.traits.length > 0 ? officer.traits.join(", ") : "Keine bekannten Traits";
    const bloodOath = officer.relationships.bloodOathWith
      ? this.getOfficerShortName(officer.relationships.bloodOathWith)
      : "Kein";
    const loyalty = officer.relationships.loyalToKing ? "Ja" : "Nein";
    const friends = this.formatOfficerNames(officer.relationships.friends);
    const rivals = this.formatOfficerNames(officer.relationships.rivals);
    const activeWarcalls = this.world.state.warcalls.filter(w => w.state !== "RESOLVED");
    const activity = describeOfficerActivity(officer, activeWarcalls, id => this.getOfficerById(id));
    const warcall = activity.warcallId
      ? this.world.state.warcalls.find(w => w.id === activity.warcallId)
      : undefined;
    const activityIcon = warcall ? `${WARCALL_TYPE_ICONS[warcall.type]} ` : "";

    const lines = [
      `${officer.name} (${officer.rank}, Lv ${officer.level})`,
      `Clan ${officer.clan} • Merit gesamt ${Math.round(officer.merit)}`,
      `Traits: ${traits}`,
      `Verbündete: ${friends}`,
      `Rivalen: ${rivals}`,
      `Blutschwur: ${bloodOath}`,
      `Loyal zum König: ${loyalty}`,
      `Aktivität: ${activityIcon}${activity.summary}`
    ];

    this.detailText.setText(lines.join("\n"));
  }

  private clearOfficerDetails(): void {
    if (this.detailMode === "OFFICER") {
      this.showDefaultDetails();
    }
  }

  private showDefaultDetails(): void {
    this.detailMode = "DEFAULT";
    this.detailLabel.setText("Details");
    this.detailText.setText(this.defaultDetailMessage);
  }

  private getOfficerById(id: string): Officer | undefined {
    return this.world.state.officers.find(officer => officer.id === id);
  }

  private formatOfficerNames(ids: string[]): string {
    if (ids.length === 0) {
      return "Keine";
    }
    return ids.map(id => this.getOfficerShortName(id)).join(", ");
  }

  private computeWarcallSuccess(warcall: Warcall): number {
    const value = estimateWarcallSuccess(this.world.state, warcall);
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  private initializeWarcallIconBar(): void {
    this.warcallIconBar = this.add.container(0, 0);
    this.warcallIconBar.setDepth(1.2);
    this.warcallIconBarBg = this.add.rectangle(0, 0, 120, 80, 0x0b1118, 0.88).setOrigin(0, 0);
    this.warcallIconBarBg.setStrokeStyle(1, 0x1f2833, 0.6);
    this.warcallIconBarBg.setInteractive({ useHandCursor: false });
    this.warcallIconBarBg.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      this.clearWarcallSelection();
    });
    this.warcallIconBar.add(this.warcallIconBarBg);
  }

  private initializeCemeteryUI(): void {
    const buttonWidth = 160;
    const buttonHeight = 36;

    this.cemeteryButton = this.add.container(0, 0);
    this.cemeteryButtonBg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x14202b, 0.9).setOrigin(0, 0);
    this.cemeteryButtonBg.setStrokeStyle(1, 0x27323f, 0.9);
    this.cemeteryLabel = this.add
      .text(14, buttonHeight / 2, "Friedhof", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#f1f2f6"
      })
      .setOrigin(0, 0.5);
    this.cemeteryCount = this.add
      .text(buttonWidth - 16, buttonHeight / 2, "(0)", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d1d9e6"
      })
      .setOrigin(1, 0.5);

    this.cemeteryButton.add([this.cemeteryButtonBg, this.cemeteryLabel, this.cemeteryCount]);
    this.cemeteryButton.setDepth(1.4);
    this.cemeteryButton.setSize(buttonWidth, buttonHeight);
    this.cemeteryButton.setInteractive(new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
    this.cemeteryButton.on("pointerover", () => {
      this.input.setDefaultCursor("pointer");
      this.cemeteryButtonBg.setStrokeStyle(1, 0xf6bd60, 0.9);
    });
    this.cemeteryButton.on("pointerout", () => {
      this.input.setDefaultCursor("default");
      this.cemeteryButtonBg.setStrokeStyle(1, 0x27323f, 0.9);
    });
    this.cemeteryButton.on("pointerdown", () => {
      this.toggleCemeteryOverlay();
    });

    this.cemeteryOverlay = this.add.container(0, 0);
    this.cemeteryScrim = this.add.rectangle(0, 0, 10, 10, 0x050b11, 0.6).setOrigin(0, 0);
    this.cemeteryScrim.setInteractive({ useHandCursor: false });
    this.cemeteryScrim.on("pointerdown", () => this.hideCemeteryOverlay());

    this.cemeteryOverlayBg = this.add.rectangle(0, 0, 360, 420, 0x0d141a, 0.95).setOrigin(0.5);
    this.cemeteryOverlayBg.setStrokeStyle(1, 0x1f2833, 0.8);
    this.cemeteryOverlayBg.setInteractive({ useHandCursor: false });
    this.cemeteryOverlayBg.on("pointerdown", (pointer: Phaser.Input.Pointer) => pointer.event?.stopPropagation());

    this.cemeteryOverlayTitle = this.add
      .text(0, 0, "Friedhof", { fontFamily: "monospace", fontSize: "18px", color: "#f1f2f6" })
      .setOrigin(0.5, 0);

    this.cemeteryOverlayList = this.add
      .text(0, 0, "", { fontFamily: "monospace", fontSize: "12px", color: "#d1d9e6", lineSpacing: 6 })
      .setOrigin(0, 0);
    this.cemeteryOverlayList.setWordWrapWidth(320);

    this.cemeteryOverlayClose = this.add
      .text(0, 0, "Schließen", { fontFamily: "monospace", fontSize: "12px", color: "#9da3ae" })
      .setOrigin(0.5, 0.5);
    this.cemeteryOverlayClose.setInteractive({ useHandCursor: true });
    this.cemeteryOverlayClose.on("pointerdown", () => this.hideCemeteryOverlay());

    this.cemeteryOverlay.add([
      this.cemeteryScrim,
      this.cemeteryOverlayBg,
      this.cemeteryOverlayTitle,
      this.cemeteryOverlayList,
      this.cemeteryOverlayClose
    ]);
    this.cemeteryOverlay.setDepth(10);
    this.cemeteryOverlay.setVisible(false);
  }

  private updateCemeteryUI(): void {
    const fallen = this.world.state.officers.filter(officer => officer.status !== "ALIVE");
    this.cemeteryCount.setText(`(${fallen.length})`);
    this.cemeteryButton.setAlpha(fallen.length > 0 ? 1 : 0.6);
    this.updateCemeteryOverlayList(fallen);
  }

  private updateCemeteryOverlayList(fallen: Officer[]): void {
    if (fallen.length === 0) {
      this.cemeteryOverlayList.setText("Noch keine Gefallenen.");
      return;
    }
    const lines = fallen.map(officer => {
      const status = officer.status === "MISSING" ? "Vermisst" : "Gefallen";
      return `• ${officer.name} (${officer.rank}, Lv ${officer.level}) – ${status}`;
    });
    this.cemeteryOverlayList.setText(lines.join("\n\n"));
  }

  private showCemeteryOverlay(): void {
    this.updateCemeteryOverlayList(this.world.state.officers.filter(officer => officer.status !== "ALIVE"));
    this.cemeteryOverlay.setVisible(true);
  }

  private hideCemeteryOverlay(): void {
    if (this.cemeteryOverlay) {
      this.cemeteryOverlay.setVisible(false);
    }
  }

  private toggleCemeteryOverlay(): void {
    if (!this.cemeteryOverlay) return;
    if (this.cemeteryOverlay.visible) {
      this.hideCemeteryOverlay();
    } else {
      this.showCemeteryOverlay();
    }
  }

  private layoutWarcallIcons(): void {
    if (!this.warcallIconBarBg) return;
    const total = this.warcallIcons.size;
    if (total === 0) {
      this.warcallIconBar.setVisible(false);
      return;
    }
    this.warcallIconBar.setVisible(true);
    const width = this.warcallIconBarBg.displayWidth;
    const barHeight = this.warcallIconBarBg.displayHeight;
    const iconSize = 72;
    const spacing = total > 1 ? Math.max(14, Math.min(36, (width - iconSize * total) / (total - 1))) : 0;
    const totalWidth = total * iconSize + Math.max(0, total - 1) * spacing;
    const startX = Math.max(0, (width - totalWidth) / 2);
    let index = 0;
    this.warcallIcons.forEach(container => {
      const x = startX + iconSize / 2 + index * (iconSize + spacing);
      const y = barHeight / 2;
      container.setPosition(x, y);
      index += 1;
    });
  }

  private applyWarcallIconVisuals(id: string): void {
    const container = this.warcallIcons.get(id);
    const meta = this.warcallIconMeta.get(id);
    if (!container || !meta) return;
    const hover = container.getData("hover") === true;
    const highlight = container.getData("highlight") === true;
    const selected = container.getData("selected") === true;
    const strokeColor = hover || selected ? 0xf6bd60 : highlight ? 0x4cc9f0 : 0x233341;
    const strokeAlpha = hover || selected ? 1 : highlight ? 0.9 : 0.7;
    const strokeWidth = hover || selected ? 3 : 2;
    meta.bg.setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);
    container.setScale(hover || selected ? 1.08 : 1);
  }

  private createWarcallIcon(warcall: Warcall): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.setSize(76, 76);
    container.setDepth(1.3);

    const bg = this.add.rectangle(0, 0, 68, 68, 0x14202b, 0.92).setOrigin(0.5);
    const icon = this.add
      .text(0, -10, WARCALL_TYPE_ICONS[warcall.type], { fontFamily: "monospace", fontSize: "28px", color: "#f7f9fc" })
      .setOrigin(0.5);
    const label = this.add
      .text(0, 14, WARCALL_TYPE_LABELS[warcall.type], { fontFamily: "monospace", fontSize: "10px", color: "#d1d9e6" })
      .setOrigin(0.5, 0);
    const chance = this.add
      .text(0, 30, "", { fontFamily: "monospace", fontSize: "10px", color: "#a9b7c6" })
      .setOrigin(0.5, 0);

    container.add([bg, icon, label, chance]);
    container.setDataEnabled();
    container.setData({ hover: false, highlight: false, selected: false, warcallId: warcall.id });
    container.setInteractive(new Phaser.Geom.Circle(0, 0, 36), Phaser.Geom.Circle.Contains);
    container.on("pointerover", () => {
      container.setData("hover", true);
      this.applyWarcallIconVisuals(warcall.id);
      this.input.setDefaultCursor("pointer");
    });
    container.on("pointerout", () => {
      container.setData("hover", false);
      this.applyWarcallIconVisuals(warcall.id);
      this.input.setDefaultCursor("default");
    });
    container.on("pointerdown", () => {
      const id = container.getData("warcallId");
      const live = this.world.state.warcalls.find(w => w.id === id && w.state !== "RESOLVED");
      if (live) {
        this.showWarcallDetails(live);
      }
    });

    this.warcallIconMeta.set(warcall.id, { bg, icon, label, chance });
    return container;
  }

  private updateWarcallIcon(warcall: Warcall, highlight: boolean): void {
    const container = this.warcallIcons.get(warcall.id);
    const meta = this.warcallIconMeta.get(warcall.id);
    if (!container || !meta) return;
    container.setData("warcallId", warcall.id);
    container.setData("highlight", highlight);
    container.setData("selected", this.focusedWarcallId === warcall.id);
    meta.icon.setText(WARCALL_TYPE_ICONS[warcall.type]);
    meta.label.setText(WARCALL_TYPE_LABELS[warcall.type]);
    meta.chance.setText(`${Math.round(this.computeWarcallSuccess(warcall) * 100)}%`);
    this.applyWarcallIconVisuals(warcall.id);
  }

  private syncWarcallIcons(summary?: CycleSummary): void {
    const active = this.world.state.warcalls.filter(warcall => warcall.state !== "RESOLVED");
    const highlights = new Set(summary?.newWarcalls.map(w => w.id) ?? []);
    const seen = new Set<string>();

    active.forEach(warcall => {
      let container = this.warcallIcons.get(warcall.id);
      if (!container) {
        container = this.createWarcallIcon(warcall);
        this.warcallIcons.set(warcall.id, container);
        this.warcallIconBar.add(container);
      }
      this.updateWarcallIcon(warcall, highlights.has(warcall.id));
      seen.add(warcall.id);
    });

    this.warcallIcons.forEach((container, id) => {
      if (!seen.has(id)) {
        container.destroy(true);
        this.warcallIcons.delete(id);
        this.warcallIconMeta.delete(id);
      }
    });

    this.layoutWarcallIcons();
  }

  private focusWarcall(warcall: Warcall): void {
    this.focusedWarcallId = warcall.id;
    this.focusHighlightIds = new Set<string>();
    this.collectParticipantIds(warcall).forEach(id => this.focusHighlightIds.add(id));
    warcall.hiddenRoles.forEach(role => this.focusHighlightIds.add(role.who));
  }

  private clearWarcallSelection(): void {
    if (!this.focusedWarcallId) {
      if (this.detailMode === "WARCALL") {
        this.showDefaultDetails();
      }
      return;
    }
    this.focusedWarcallId = null;
    this.focusHighlightIds.clear();
    if (this.detailMode === "WARCALL") {
      this.showDefaultDetails();
    }
    this.syncOfficerTokens(this.lastSummary);
    this.syncWarcallIcons(this.lastSummary);
    this.refreshWarcalls(this.lastSummary);
    this.drawConnections(this.lastSummary);
  }

  private showWarcallDetails(warcall: Warcall): void {
    this.detailMode = "WARCALL";
    this.detailLabel.setText("Details – Warcall");
    this.focusWarcall(warcall);

    const icon = WARCALL_TYPE_ICONS[warcall.type];
    const label = WARCALL_TYPE_LABELS[warcall.type];
    const goal = WARCALL_TYPE_GOALS[warcall.type];
    const chance = Math.round(this.computeWarcallSuccess(warcall) * 100);
    const initiator = this.getOfficerById(warcall.initiator);
    const initiatorName = initiator ? initiator.name : this.getOfficerShortName(warcall.initiator);

    const participantIds = this.collectParticipantIds(warcall);
    const participantLines = participantIds.map(id => {
      const officer = this.getOfficerById(id);
      const name = officer ? officer.name : this.getOfficerShortName(id);
      const role = officer ? resolveParticipantRole(warcall, officer, initiator) : id === warcall.initiator ? "Ausrufer" : "Teilnehmer";
      return `• ${name} – ${role}`;
    });

    const hiddenExtras = warcall.hiddenRoles.filter(role => !participantIds.includes(role.who));
    const hiddenLines = hiddenExtras.length > 0
      ? [`Verdeckte Beteiligte: ${hiddenExtras
          .map(role => `${this.getOfficerShortName(role.who)} – ${role.role}`)
          .join(", ")}`]
      : [];

    const titleLine = warcall.rewards.titles.length > 0 ? `Titel: ${warcall.rewards.titles.join(", ")}` : undefined;

    const lines: string[] = [
      `${icon} ${label} @ ${warcall.location}`,
      `Initiator: ${initiatorName}`,
      `Ziel: ${goal}`,
      `Belohnung: ${warcall.rewards.merit} Merit • ${warcall.rewards.xp} XP`
    ];
    if (titleLine) lines.push(titleLine);
    lines.push(`Erfolgschance für ${this.getOfficerShortName(warcall.initiator)}: ${chance}%`);
    lines.push("", "Beteiligte:");
    lines.push(...participantLines);
    if (hiddenLines.length > 0) {
      lines.push("", ...hiddenLines);
    }

    this.detailText.setText(lines.join("\n"));

    this.syncOfficerTokens(this.lastSummary);
    this.syncWarcallIcons(this.lastSummary);
    this.refreshWarcalls(this.lastSummary);
    this.drawConnections(this.lastSummary);
  }

  private validateWarcallFocus(): void {
    if (!this.focusedWarcallId) return;
    const stillActive = this.world.state.warcalls.some(
      warcall => warcall.id === this.focusedWarcallId && warcall.state !== "RESOLVED"
    );
    if (!stillActive) {
      this.focusedWarcallId = null;
      this.focusHighlightIds.clear();
      if (this.detailMode === "WARCALL") {
        this.showDefaultDetails();
      }
    }
  }

  private collectParticipantIds(warcall: Warcall): string[] {
    const ids = warcall.participants.includes(warcall.initiator)
      ? warcall.participants
      : [warcall.initiator, ...warcall.participants];
    return Array.from(new Set(ids));
  }

  private getOfficerShortName(id: string): string {
    const officer = this.world.state.officers.find(o => o.id === id);
    if (!officer) return id.slice(0, 6);
    const label = shortLabel(officer.name);
    return officer.rank === "König" ? `👑 ${label}` : label;
  }
}
