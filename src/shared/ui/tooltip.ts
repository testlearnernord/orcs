import type { WarcallResolution } from '@sim/types';
import { warcallTooltip } from '@sim/warcall';
import { Z_LAYERS } from '@ui/layers';
import { UIContainer } from '@ui/primitives';

export class TooltipBreakdown extends UIContainer {
  text = '';

  constructor() {
    super({ x: 0, y: 0 });
    this.setDepth(Z_LAYERS.TOOLTIP).setScrollFactor(0);
  }

  show(resolution: WarcallResolution): void {
    this.text = warcallTooltip(resolution);
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }
}
