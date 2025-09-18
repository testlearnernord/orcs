import { Z_LAYERS } from '@ui/layers';
import { UIContainer } from '@ui/primitives';

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
  readonly buttons: HotkeyButton[];
  onChanged?: () => void;


  constructor() {
    super({ x: 0, y: 0 });
    this.buttons = DEFAULT_HOTKEYS.map((button) => ({ ...button }));
    this.setDepth(Z_LAYERS.FEED + 10).setScrollFactor(0);
  }

  toggle(key: string, visible: boolean): void {
    const button = this.buttons.find((entry) => entry.key === key);
    if (button) {
      button.visible = visible;
      this.onChanged?.();

    }
  }
}
