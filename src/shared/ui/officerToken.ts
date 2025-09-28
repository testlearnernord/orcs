import type { Officer } from '@sim/types';
import { Z_LAYERS } from '@ui/layers';
import { UIContainer } from '@ui/primitives';

const RANK_LAYER: Record<Officer['rank'], number> = {
  König: Z_LAYERS.HERRSCHAFT,
  Spieler: Z_LAYERS.HERRSCHAFT,
  Captain: Z_LAYERS.CAPTAINS,
  Späher: Z_LAYERS.SPAEHER,
  Grunzer: Z_LAYERS.GRUNZER
};

export class OfficerToken extends UIContainer {
  readonly officer: Officer;
  readonly badges: string[];

  constructor(officer: Officer, radius = 48) {
    super({ x: 0, y: 0 });
    this.officer = officer;
    this.badges = officer.traits;
    this.setCircleHitArea(radius);
    this.setDepth(RANK_LAYER[officer.rank]);
  }

  isPointInside(x: number, y: number): boolean {
    return this.hitTest({ x, y });
  }
}
