import type { CycleSummary } from '@sim/types';

export class CycleSweep {
  private readonly root: HTMLDivElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'cycle-sweep hidden';
    this.root.innerHTML = `<div class="cycle-sweep__wave"></div>`;
    document.body.appendChild(this.root);
  }

  play(summary: CycleSummary): void {
    this.root.dataset.cycle = `${summary.cycle}`;
    this.root.classList.remove('hidden');
    this.root.classList.add('is-active');
    setTimeout(() => {
      this.root.classList.remove('is-active');
      this.root.classList.add('hidden');
    }, 420);
  }
}
