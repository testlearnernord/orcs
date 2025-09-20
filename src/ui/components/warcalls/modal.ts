import { getPortraitAsset } from '@sim/portraits';
import type { Officer } from '@sim/types';
import type { WarcallEntry } from '@ui/components/warcalls/types';

const PHASES: { key: string; label: string }[] = [
  { key: 'prep', label: 'Vorbereitung' },
  { key: 'travel', label: 'Anreise' },
  { key: 'event', label: 'Konflikt' },
  { key: 'resolution', label: 'Auflösung' }
];

function roleFor(officer: Officer, entry: WarcallEntry): string {
  if (officer.id === entry.plan.initiator) return 'Initiator';
  if (entry.resolution?.casualties.includes(officer.id)) return 'Gefallen';
  return 'Teilnehmer';
}

export interface WarcallModalOptions {
  onClose?: () => void;
  onJoin?: (entry: WarcallEntry) => void;
  onRedirect?: (entry: WarcallEntry) => void;
  onSabotage?: (entry: WarcallEntry) => void;
}

export class WarcallModal {
  private readonly root: HTMLDivElement;
  private readonly options: WarcallModalOptions;
  private current: WarcallEntry | null = null;

  constructor(options: WarcallModalOptions = {}) {
    this.options = options;
    this.root = document.createElement('div');
    this.root.className = 'warcall-modal hidden';
    this.root.innerHTML = `
      <div class="warcall-modal__backdrop"></div>
      <div class="warcall-modal__dialog" role="dialog" aria-modal="true">
        <button class="warcall-modal__close" aria-label="Schließen">×</button>
        <div class="warcall-modal__content"></div>
      </div>
    `;
    document.body.appendChild(this.root);
    this.root
      .querySelector('.warcall-modal__backdrop')
      ?.addEventListener('click', () => this.close());
    this.root
      .querySelector('.warcall-modal__close')
      ?.addEventListener('click', () => this.close());
  }

  private render(entry: WarcallEntry): void {
    const container = this.root.querySelector<HTMLDivElement>(
      '.warcall-modal__content'
    );
    if (!container) return;
    const phase = entry.phase;
    container.innerHTML = `
      <header>
        <h3>${entry.plan.kind}</h3>
        <p>${entry.plan.location} • Ausgerufen in Zyklus ${entry.plan.cycleAnnounced}</p>
        <p>Risiko ${(entry.plan.risk * 100).toFixed(0)}% — ${
          entry.plan.rewardHint ?? 'Unbekannte Belohnung'
        }</p>
      </header>
      <section class="warcall-timeline">
        ${PHASES.map((step) => {
          const active = step.key === phase;
          return `<div class="timeline-step ${active ? 'is-active' : ''}">
            <span>${step.label}</span>
          </div>`;
        }).join('')}
      </section>
      <section class="warcall-participants">
        <h4>Teilnehmer</h4>
        <div class="warcall-participants__list">
          ${entry.participants
            .map((officer) => {
              const src = getPortraitAsset(officer.portraitSeed);
              return `<article>
                <img src="${src}" alt="${officer.name}">
                <div>
                  <strong>${officer.name}</strong>
                  <span>${roleFor(officer, entry)}</span>
                </div>
              </article>`;
            })
            .join('')}
        </div>
      </section>
      <section class="warcall-log">
        <h4>Log</h4>
        ${
          entry.resolution?.feed
            .map((line) => `<p>${line.text}</p>`)
            .join('') ?? '<p>Keine Ergebnisse bisher.</p>'
        }
      </section>
      <footer>
        <button type="button" data-action="join">Beitreten</button>
        <button type="button" data-action="redirect">Umlenken</button>
        <button type="button" data-action="sabotage">Sabotieren</button>
      </footer>
    `;
    const join = container.querySelector<HTMLButtonElement>(
      '[data-action="join"]'
    );
    const redirect = container.querySelector<HTMLButtonElement>(
      '[data-action="redirect"]'
    );
    const sabotage = container.querySelector<HTMLButtonElement>(
      '[data-action="sabotage"]'
    );
    join?.addEventListener('click', () => this.options.onJoin?.(entry));
    redirect?.addEventListener('click', () => this.options.onRedirect?.(entry));
    sabotage?.addEventListener('click', () => this.options.onSabotage?.(entry));
    if (entry.resolution) {
      join?.setAttribute('disabled', 'true');
      redirect?.setAttribute('disabled', 'true');
      sabotage?.setAttribute('disabled', 'true');
    }
  }

  open(entry: WarcallEntry): void {
    this.current = entry;
    this.render(entry);
    this.root.classList.remove('hidden');
  }

  close(): void {
    this.root.classList.add('hidden');
    this.current = null;
    this.options.onClose?.();
  }
}
