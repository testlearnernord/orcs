import type Phaser from "phaser";

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
