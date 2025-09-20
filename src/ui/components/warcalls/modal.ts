import type { Officer } from '@sim/types';
import type { GameMode } from '@state/ui/mode';
import type { WarcallEntry } from '@ui/components/warcalls/types';
import Portrait from '@ui/Portrait';

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
  private mode: GameMode = 'spectate';

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
    this.current = entry;
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
        <div class="warcall-participants__list"></div>
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
    const participantList = container.querySelector<HTMLDivElement>(
      '.warcall-participants__list'
    );
    if (participantList) {
      this.renderParticipants(participantList, entry);
    }
    const controls: (HTMLButtonElement | null)[] = [join, redirect, sabotage];
    const spectateDisabled = this.mode !== 'player';
    const resolved = Boolean(entry.resolution);
    controls.forEach((button) => {
      if (!button) return;
      const disabled = spectateDisabled || resolved;
      button.disabled = disabled;
      if (spectateDisabled) {
        button.title = 'Im Spectate-Mode nicht verfügbar.';
        button.classList.add('is-disabled');
      } else {
        button.classList.remove('is-disabled');
        button.removeAttribute('title');
      }
    });
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

  setMode(mode: GameMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (this.current) {
      this.render(this.current);
    }
  }

  private renderParticipants(list: HTMLElement, entry: WarcallEntry): void {
    list.innerHTML = '';
    entry.participants.forEach((officer) => {
      const article = document.createElement('article');
      const avatar = new Portrait(officer, {
        size: 40,
        className: 'warcall-participant-avatar',
        dead:
          entry.resolution?.casualties.includes(officer.id) ??
          officer.status === 'DEAD'
      });
      avatar.element.setAttribute('role', 'img');
      avatar.element.setAttribute('aria-label', officer.name);
      avatar.element.setAttribute('aria-hidden', 'false');
      article.appendChild(avatar.element);
      const info = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = officer.name;
      const role = document.createElement('span');
      role.textContent = roleFor(officer, entry);
      info.append(name, role);
      article.appendChild(info);
      list.appendChild(article);
    });
  }
}
