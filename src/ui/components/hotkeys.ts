import { Z_LAYERS } from '../layers';
import { UIContainer } from '../primitives';

export interface HotkeyButton {
  key: string;
  label: string;
  scrollFactor: number;
  visible: boolean;
}

const DEFAULT_HOTKEYS: HotkeyButton[] = [
  { key: 'E', label: 'Cycle', scrollFactor: 0, visible: true },
  { key: 'R', label: 'Neu', scrollFactor: 0, visible: true },
  { key: 'SPACE', label: 'Skip', scrollFactor: 0, visible: true }
];

export class HotkeyBar extends UIContainer {
  readonly buttons: HotkeyButton[] = DEFAULT_HOTKEYS.map((b) => ({ ...b }));

  constructor() {
    super({ x: 0, y: 0 });
    this.setDepth(Z_LAYERS.FEED + 10).setScrollFactor(0);
  }

  toggle(key: string, visible: boolean): void {
    const b = this.buttons.find((x) => x.key === key);
    if (b) b.visible = visible;
  }
}
