import type Phaser from "phaser";
import type { Officer } from "@sim/types";
import type { BoardArea } from "@game/ui/layout";

interface LevelDefinition {
  key: string;
  label: string;
  ranks: Officer["rank"][];
  layout: "royal" | "row";
  yRatio: number;
}

interface RawLevel {
  key: string;
  label: string;
  layout: "royal" | "row";
  ratio: number;
  officers: Officer[];
}

export interface HierarchyLevel {
  key: string;
  label: string;
  y: number;
  top: number;
  bottom: number;
  officers: Officer[];
}

export interface HierarchyLayoutResult {
  positions: Map<string, Phaser.Types.Math.Vector2Like>;
  levels: HierarchyLevel[];
}

const LEVEL_DEFINITIONS: LevelDefinition[] = [
  { key: "royal", label: "Herrschaft", ranks: ["König", "Herausforderer"], layout: "royal", yRatio: 0.14 },
  { key: "captains", label: "Captains", ranks: ["Anführer", "Captain"], layout: "row", yRatio: 0.38 },
  { key: "scouts", label: "Späher", ranks: ["Späher"], layout: "row", yRatio: 0.62 },
  { key: "grunts", label: "Grunzer", ranks: ["Grunzer"], layout: "row", yRatio: 0.85 }
];

const MIN_ROW_SPACING = 120;
const MAX_ROW_SPACING = 220;
const EDGE_PADDING = 64;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function layoutRow(
  officers: Officer[],
  y: number,
  area: BoardArea,
  positions: Map<string, Phaser.Types.Math.Vector2Like>
): void {
  const count = officers.length;
  if (count === 0) return;
  if (count === 1) {
    positions.set(officers[0].id, { x: area.x + area.width / 2, y });
    return;
  }

  const span = Math.min(area.width * 0.86, Math.max(count * MIN_ROW_SPACING, MIN_ROW_SPACING * 2));
  const step = clamp(span / Math.max(1, count - 1), MIN_ROW_SPACING, MAX_ROW_SPACING);
  const effectiveSpan = step * (count - 1);
  const start = area.x + area.width / 2 - effectiveSpan / 2;
  const minX = area.x + EDGE_PADDING;
  const maxX = area.x + area.width - EDGE_PADDING;

  officers.forEach((officer, index) => {
    const rawX = start + step * index;
    const x = clamp(rawX, minX, maxX);
    positions.set(officer.id, { x, y });
  });
}

function layoutRoyal(
  officers: Officer[],
  kingId: string,
  y: number,
  area: BoardArea,
  positions: Map<string, Phaser.Types.Math.Vector2Like>
): void {
  if (officers.length === 0) return;
  const centerX = area.x + area.width / 2;
  const king = officers.find(officer => officer.id === kingId) ?? officers[0];
  const challengers = officers.filter(officer => officer.id !== king.id);

  positions.set(king.id, { x: centerX, y });

  if (challengers.length === 0) return;

  const spacing = Math.max(MIN_ROW_SPACING * 0.9, Math.min(MAX_ROW_SPACING, area.width / Math.max(3, challengers.length + 1)));
  challengers
    .slice()
    .sort((a, b) => b.merit - a.merit || a.name.localeCompare(b.name))
    .forEach((officer, index) => {
      const direction = index % 2 === 0 ? -1 : 1;
      const step = Math.floor(index / 2) + 1;
      const offsetX = direction * spacing * step;
      const x = clamp(centerX + offsetX, area.x + EDGE_PADDING, area.x + area.width - EDGE_PADDING);
      const offsetY = index % 2 === 0 ? -12 : 12;
      positions.set(officer.id, { x, y: y + offsetY });
    });
}

export function computeHierarchyLayout(
  officers: Officer[],
  kingId: string,
  area: BoardArea
): HierarchyLayoutResult {
  const positions = new Map<string, Phaser.Types.Math.Vector2Like>();
  const placed = new Set<string>();
  const usableHeight = Math.max(area.height, 1);

  const rawLevels: RawLevel[] = LEVEL_DEFINITIONS.map(def => ({
    key: def.key,
    label: def.label,
    layout: def.layout,
    ratio: def.yRatio,
    officers: officers.filter(officer => def.ranks.includes(officer.rank))
  }));

  rawLevels.forEach(level => {
    const levelY = area.y + usableHeight * level.ratio;
    const levelOfficers = level.officers
      .filter(officer => !placed.has(officer.id))
      .sort((a, b) => b.merit - a.merit || a.level - b.level || a.name.localeCompare(b.name));

    if (level.layout === "royal") {
      if (levelOfficers.length > 0) {
        layoutRoyal(levelOfficers, kingId, levelY, area, positions);
        levelOfficers.forEach(officer => placed.add(officer.id));
      }
    } else {
      layoutRow(levelOfficers, levelY, area, positions);
      levelOfficers.forEach(officer => placed.add(officer.id));
    }

    level.officers = levelOfficers;
  });

  const remaining = officers.filter(officer => !placed.has(officer.id));
  if (remaining.length > 0) {
    const ratio = clamp(0.92 - Math.min(0.15, remaining.length * 0.01), 0.72, 0.94);
    const label = "Außenseiter";
    const y = area.y + usableHeight * ratio;
    layoutRow(remaining, y, area, positions);
    rawLevels.push({ key: "outsiders", label, layout: "row", ratio, officers: remaining.slice() });
  }

  const activeLevels = rawLevels.filter(level => level.officers.length > 0);
  activeLevels.sort((a, b) => a.ratio - b.ratio);

  const levels: HierarchyLevel[] = activeLevels.map((level, index) => {
    const y = area.y + usableHeight * level.ratio;
    const prevY = index === 0 ? area.y : area.y + usableHeight * activeLevels[index - 1].ratio;
    const nextY = index === activeLevels.length - 1 ? area.y + area.height : area.y + usableHeight * activeLevels[index + 1].ratio;
    const top = index === 0 ? area.y : (prevY + y) / 2;
    const bottom = index === activeLevels.length - 1 ? area.y + area.height : (y + nextY) / 2;
    return {
      key: level.key,
      label: level.label,
      y,
      top,
      bottom,
      officers: level.officers
    };
  });

  return { positions, levels };
}
