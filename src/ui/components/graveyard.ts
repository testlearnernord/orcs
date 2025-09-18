import type { Officer } from '@sim/types';
import { Z_LAYERS } from '@ui/layers';
import { UIContainer } from '@ui/primitives';

export interface GraveyardEntry {
  id: string;
  name: string;
  cycle: number;
}

export class GraveyardPanel extends UIContainer {
  private readonly entries: GraveyardEntry[];
  private readonly rowHeight: number;
  private readonly viewHeight: number;
  private offset = 0;
  isOpen = true;

  constructor(
    officers: Officer[],
    options: { rowHeight?: number; viewHeight?: number } = {}
  ) {
    super({ x: 0, y: 0 });
    this.entries = officers.map((o) => ({
      id: o.id,
      name: o.name,
      cycle: o.cycleDied ?? 0
    }));
    this.rowHeight = options.rowHeight ?? 36;
    this.viewHeight = options.viewHeight ?? 180;
    this.setDepth(Z_LAYERS.MODAL);
  }

  get size(): number {
    return this.entries.length;
  }
  get scrollOffset(): number {
    return this.offset;
  }
  get maxScroll(): number {
    return Math.max(0, this.entries.length * this.rowHeight - this.viewHeight);
  }

  scroll(delta: number): void {
    this.offset = Math.min(this.maxScroll, Math.max(0, this.offset + delta));
  }

  onWheel(deltaY: number): void {
    this.scroll(deltaY);
  }
  close(): void {
    this.isOpen = false;
  }

  listVisible(): GraveyardEntry[] {
    const start = Math.floor(this.offset / this.rowHeight);
    const visibleCount = Math.ceil(this.viewHeight / this.rowHeight);
    return this.entries.slice(start, start + visibleCount);
  }
}
