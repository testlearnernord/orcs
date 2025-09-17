import type Phaser from "phaser";

/**

 * Rechteckiger Bereich innerhalb dessen die Offiziers-Token platziert
 * werden sollen.
 */
export interface BoardArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**


 * Konfiguriert das Grid, in dem die Offiziers-Token auf dem Schlachtfeld
 * angezeigt werden.
 */
export interface OfficerGridConfig {
  columns: number;
  cellWidth: number;
  cellHeight: number;
  originX: number;
  originY: number;
}

/**
 * Standardlayout für die Token-Anordnung.
 */
export const DEFAULT_OFFICER_GRID: OfficerGridConfig = Object.freeze({
  columns: 5,
  cellWidth: 120,
  cellHeight: 110,
  originX: 120,
  originY: 120
});


function clamp(value: number, min: number, max: number): number {
  let lower = min;
  let upper = max;
  if (upper < lower) {
    [lower, upper] = [upper, lower];
  }
  return Math.min(Math.max(value, lower), upper);
}

/**
 * Erzeugt eine Grid-Konfiguration, die sich dynamisch an die verfügbare
 * Breite und Höhe eines Boards anpasst.
 */
export function createAdaptiveGridConfig(
  area: BoardArea,
  total: number
): OfficerGridConfig {
  const safeTotal = Math.max(1, Math.floor(total));
  if (!Number.isFinite(area.width) || !Number.isFinite(area.height) || area.width <= 0 || area.height <= 0) {
    return DEFAULT_OFFICER_GRID;
  }

  const safeWidth = Math.max(area.width, 1);
  const safeHeight = Math.max(area.height, 1);
  const horizontalPadding = clamp(safeWidth * 0.1, 48, safeWidth / 2);
  const verticalPadding = clamp(safeHeight * 0.1, 48, safeHeight / 2);
  const usableWidth = Math.max(1, safeWidth - horizontalPadding * 2);
  const usableHeight = Math.max(1, safeHeight - verticalPadding * 2);

  if (usableWidth < 1 || usableHeight < 1) {
    return DEFAULT_OFFICER_GRID;
  }

  const maxColumnsFromWidth = Math.max(1, Math.floor(usableWidth / 96));
  const maxRowsFromHeight = Math.max(1, Math.floor(usableHeight / 110));
  const allowedMaxColumns = Math.max(1, Math.min(6, maxColumnsFromWidth, safeTotal));
  const desired = Math.ceil(Math.sqrt(safeTotal));
  let columns = clamp(desired, 1, allowedMaxColumns);
  const minColumns = Math.max(1, Math.min(allowedMaxColumns, Math.ceil(safeTotal / maxRowsFromHeight)));
  if (columns < minColumns) {
    columns = minColumns;
  }

  let rows = Math.max(1, Math.ceil(safeTotal / columns));
  while (rows > maxRowsFromHeight && columns < allowedMaxColumns) {
    columns += 1;
    rows = Math.max(1, Math.ceil(safeTotal / columns));
  }

  const cellWidth = usableWidth / columns;
  const cellHeight = usableHeight / rows;
  const originX = area.x + horizontalPadding + cellWidth / 2;
  const originY = area.y + verticalPadding + cellHeight / 2;

  return { columns, cellWidth, cellHeight, originX, originY };
}



/**
 * Berechnet die Positionen für Offiziers-Token in einem Grid.
 *
 * @example
 * const positions = computeOfficerPositions(4);
 * // => [ { x: 120, y: 120 }, { x: 240, y: 120 }, ... ]
 */
export function computeOfficerPositions(
  total: number,
  config: OfficerGridConfig = DEFAULT_OFFICER_GRID
): Phaser.Types.Math.Vector2Like[] {
  return Array.from({ length: total }, (_value, index) => {
    const column = index % config.columns;
    const row = Math.floor(index / config.columns);
    return {
      x: config.originX + column * config.cellWidth,
      y: config.originY + row * config.cellHeight
    };
  });
}
