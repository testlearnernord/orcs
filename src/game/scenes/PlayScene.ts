import { getPhaser } from "@game/phaserRuntime";

import { OfficerToken } from "@game/ui/OfficerToken";
import { collectHighlightIds } from "@game/ui/highlights";
import { computeOfficerPositions, createAdaptiveGridConfig, type BoardArea } from "@game/ui/layout";
import type { CycleSummary, CycleTrigger, Officer, Warcall } from "@sim/types";



import { OfficerToken } from "@game/ui/OfficerToken";
import { collectHighlightIds } from "@game/ui/highlights";
import { computeOfficerPositions } from "@game/ui/layout";
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
  private boardArea: BoardArea = { x: 120, y: 120, width: 620, height: 500 };
  private sidebarArea: BoardArea = { x: 660, y: 36, width: 280, height: 520 };
  private sidebarPadding = 24;


  private feedText!: Phaser.GameObjects.Text;
  private warcallsText!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private connections!: Phaser.GameObjects.Graphics;



  constructor() {
    super("Play");
  }

  create() {
    this.world = new World({ seed: Date.now() });


    this.boardBg = this.add.rectangle(0, 0, 10, 10, 0x101720, 0.92).setOrigin(0, 0);
    this.boardBg.setStrokeStyle(2, 0x27323f, 0.85);

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
      .text(0, 0, "Fahre mit der Maus über ein Porträt oder tippe es an.", {
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

    this.scale.on(Phaser.Scale.Events.RESIZE, this.configureLayout, this);

    this.configureLayout();


    this.boardBg = this.add.rectangle(0, 0, 10, 10, 0x101720, 0.92).setOrigin(0, 0);
    this.boardBg.setStrokeStyle(2, 0x27323f, 0.85);

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
      .text(0, 0, "Fahre mit der Maus über ein Porträt oder tippe es an.", {
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

    this.scale.on(Phaser.Scale.Events.RESIZE, this.configureLayout, this);

    this.configureLayout();



    const boardBg = this.add.rectangle(320, 270, 620, 500, 0x101720, 0.92);
    boardBg.setStrokeStyle(2, 0x27323f, 0.85);

    const sidebar = this.add.rectangle(800, 270, 280, 520, 0x0d141a, 0.92);
    sidebar.setStrokeStyle(1, 0x1f2833, 0.6);

    this.connections = this.add.graphics();
    this.connections.setDepth(0.5);

    this.cycleText = this.add.text(24, 24, "", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#f1f2f6"
    });

    this.triggerText = this.add.text(24, 54, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cbd0d6"
    });

    this.add.text(660, 36, "Welt-Feed", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#f1f2f6"
    });

    this.feedText = this.add
      .text(660, 68, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d1d9e6",
        lineSpacing: 6
      })
      .setWordWrapWidth(240);

    this.add.text(660, 268, "Aktive Warcalls", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#f1f2f6"
    });

    this.warcallsText = this.add
      .text(660, 296, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d1d9e6",
        lineSpacing: 6
      })
      .setWordWrapWidth(240);

    this.add.text(660, 424, "Details", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#f1f2f6"
    });

    this.detailText = this.add
      .text(660, 452, "Fahre mit der Maus über ein Porträt oder tippe es an.", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d1d9e6",
        lineSpacing: 4
      })
      .setWordWrapWidth(240);

    this.add.text(24, 504, "E: Cycle simulieren   R: Welt neu generieren", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#9da3ae"

    this.input.keyboard!.on("keydown-E", () => {
      const summary = this.world.runCycle();
      this.info.setText(`Cycle ${summary.cycle} | Feed: ${summary.feed.length} | Resolved: ${summary.resolved.length}`);
      console.table(summary.feed.slice(-5));


    });


    this.refreshScene();

    this.input.keyboard!.on("keydown-E", () => this.advanceCycle());
    this.input.keyboard!.on("keydown-R", () => this.resetWorld());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.officerTokens.forEach(token => token.destroy());
      this.officerTokens.clear();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.configureLayout, this);

      this.scale.off(Phaser.Scale.Events.RESIZE, this.configureLayout, this);

    });
  }

  update(_t: number, _d: number) {}



n


  private advanceCycle(): void {
    const summary = this.world.runCycle();
    this.refreshScene(summary);
  }

  private resetWorld(): void {
    this.officerTokens.forEach(token => token.destroy());
    this.officerTokens.clear();
    this.world = new World({ seed: Date.now() });
    this.refreshScene();
  }

  private refreshScene(summary?: CycleSummary): void {
    const highlightIds = collectHighlightIds(summary);
    this.cycleText.setText(`Cycle ${this.world.state.cycle}`);
    const trigger = summary ? this.formatTrigger(summary.trigger) : "Start der Kampagne";
    this.triggerText.setText(`Auslöser: ${trigger}`);

    this.syncOfficerTokens(highlightIds, summary);
    this.refreshFeed(summary);
    this.refreshWarcalls(summary);
    this.drawConnections(summary);

    this.updateSidebarFlow();


    this.updateSidebarFlow();


  }

  private formatTrigger(trigger: CycleTrigger): string {
    return TRIGGER_LABELS[trigger] ?? trigger;
  }

  private syncOfficerTokens(highlightIds: Set<string>, summary?: CycleSummary): void {
    const total = this.world.state.officers.length;
    const config = createAdaptiveGridConfig(this.boardArea, total);
    const positions = computeOfficerPositions(total, config);


    const positions = computeOfficerPositions(this.world.state.officers.length);

    const seen = new Set<string>();
    const immediate = !summary;

    this.world.state.officers.forEach((officer, index) => {
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

    const latest = this.world.state.feed.slice(-7);

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
    const marker = highlight ? "»" : "•";
    const roster = [warcall.initiator, ...warcall.participants]
      .map(id => this.getOfficerShortName(id))
      .join(", ");
    return `${marker} ${warcall.type} @ ${warcall.location}\n   ${roster}`;
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

    this.boardArea = { x: boardX, y: boardY, width: boardWidth, height: boardHeight };
    this.sidebarArea = { x: sidebarX, y: padding, width: sidebarWidth, height: sidebarHeight };
    this.sidebarPadding = Math.max(20, Math.round(sidebarWidth * 0.08));

    this.reflowOfficerPositions();
    this.drawConnections();
    this.updateSidebarFlow();
  }

  private reflowOfficerPositions(): void {
    if (!this.world || this.officerTokens.size === 0) {
      return;
    }
    const total = this.world.state.officers.length;
    const config = createAdaptiveGridConfig(this.boardArea, total);
    const positions = computeOfficerPositions(total, config);
    this.world.state.officers.forEach((officer, index) => {
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
    const traits = officer.traits.length > 0 ? officer.traits.join(", ") : "Keine bekannten Traits";
    const bloodOath = officer.relationships.bloodOathWith
      ? `Blutschwur: ${this.getOfficerShortName(officer.relationships.bloodOathWith)}`
      : undefined;
    const loyalty = officer.relationships.loyalToKing ? "Loyal zum König" : undefined;
    const friends = officer.relationships.friends.length > 0 ? `Freunde: ${officer.relationships.friends.length}` : undefined;
    const rivals = officer.relationships.rivals.length > 0 ? `Rivalen: ${officer.relationships.rivals.length}` : undefined;
    const relationshipInfo = [bloodOath, loyalty, friends, rivals].filter(Boolean).join(" • ") || "Ungebunden";

    this.detailText.setText(
      `${officer.name} (${officer.rank}, Lv ${officer.level})\n` +
        `Clan ${officer.clan} • Merit ${officer.merit}\n` +
        `Traits: ${traits}\n` +
        `Beziehungen: ${relationshipInfo}`
    );
  }

  private clearOfficerDetails(): void {
    this.detailText.setText("Fahre mit der Maus über ein Porträt oder tippe es an.");
  }

  private getOfficerShortName(id: string): string {
    const officer = this.world.state.officers.find(o => o.id === id);
    if (!officer) return id.slice(0, 6);
    const label = shortLabel(officer.name);
    return officer.rank === "König" ? `👑 ${label}` : label;
  }

}
