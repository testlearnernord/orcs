import type { Rank } from '@sim/types';

export interface EmptySlotOptions {
  rank: Rank;
  slotIndex: number;
  onClick?: () => void;
}

/**
 * Component for rendering empty officer slots in the hierarchical layout
 */
export class EmptySlot {
  readonly element: HTMLElement;
  private readonly options: EmptySlotOptions;

  constructor(options: EmptySlotOptions) {
    this.options = options;
    this.element = document.createElement('article');
    this.element.className = 'officer-card officer-card--empty';
    this.element.dataset.rank = options.rank;
    this.element.dataset.slotIndex = options.slotIndex.toString();

    this.render();
    this.attachListeners();
  }

  private render(): void {
    const rankLabels: Record<Rank, string> = {
      König: 'König',
      Spieler: 'Spieler',
      Captain: 'Captain',
      Späher: 'Späher', 
      Grunzer: 'Grunzer'
    };

    this.element.innerHTML = `
      <div class="officer-card__avatar officer-card__avatar--empty">
        <div class="officer-card__avatar-placeholder">
          <span class="officer-card__rank-icon">${this.getRankIcon()}</span>
        </div>
      </div>
      <div class="officer-card__content">
        <div class="officer-card__header">
          <div class="officer-card__title-row">
            <h3>Freier Platz</h3>
            <span class="officer-card__level">—</span>
          </div>
          <div class="officer-card__meta">
            <span class="officer-card__rank">${rankLabels[this.options.rank]}</span>
            <span class="officer-card__merit">Merit —</span>
            <span class="officer-card__cycle">—</span>
          </div>
        </div>
        <div class="officer-card__traits officer-card__traits--empty">
          <span class="officer-card__trait--muted">Bereit für Aufstieg</span>
        </div>
        <div class="officer-card__stats officer-card__stats--empty">
          <div class="officer-card__empty-message">
            Slot ${this.options.slotIndex + 1} von ${this.getMaxSlots()}
          </div>
        </div>
      </div>
    `;
  }

  private getRankIcon(): string {
    const icons: Record<Rank, string> = {
      König: '👑',
      Spieler: '🎮',
      Captain: '⚡',
      Späher: '👁',
      Grunzer: '⚔'
    };
    return icons[this.options.rank];
  }

  private getMaxSlots(): number {
    const maxSlots: Record<Rank, number> = {
      König: 1,
      Spieler: 0,
      Captain: 3,
      Späher: 4,
      Grunzer: 12
    };
    return maxSlots[this.options.rank];
  }

  private attachListeners(): void {
    if (this.options.onClick) {
      this.element.addEventListener('click', this.options.onClick);
    }
  }

  destroy(): void {
    this.element.remove();
  }
}