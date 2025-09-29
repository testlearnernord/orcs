import type { Officer, Relationship } from '@sim/types';
import { isCtrlKeyPressed, onCtrlStateChange } from '@core/hotkeys';

type OfficerAction = (officer: Officer) => void;

type RelationWithName = Relationship & { name?: string };

export interface OfficerTooltipOptions {
  onInvite?: OfficerAction;
  onMarkRival?: OfficerAction;
  onOpenDetails?: OfficerAction;
  resolveName?: (id: string) => string | undefined;
}

const RELATION_ICONS: Record<Relationship['type'], string> = {
  ALLY: '🤝',
  RIVAL: '⚔️',
  NEUTRAL: '•'
};

function relationLabel(relation: Relationship): string {
  switch (relation.type) {
    case 'ALLY':
      return 'Allianz';
    case 'RIVAL':
      return 'Rivalität';
    case 'NEUTRAL':
      return 'Neutral';
    default:
      return relation.type;
  }
}

function formatStat(value: number): string {
  return value.toFixed(2);
}

function deriveArchetype(officer: Officer): string {
  // Use primary trait (archetype) directly
  if (officer.traits.length > 0) {
    return officer.traits[0]; // Berserker, Archer, or Trapper
  }
  return 'Unbekannt';
}

function deriveTitle(officer: Officer): string {
  switch (officer.rank) {
    case 'König':
      return 'Herr der Horde';
    case 'Spieler':
      return 'Kriegsrat';
    case 'Captain':
      return 'Klingenführer';
    case 'Späher':
      return 'Schattenauge';
    default:
      return 'Grubenläufer';
  }
}

export class OfficerTooltip {
  private readonly root: HTMLDivElement;
  private hideTimer: number | null = null;
  private currentTarget: HTMLElement | null = null;
  private currentOfficer: Officer | null = null;
  private isHovering = false;
  private readonly options: OfficerTooltipOptions;
  private ctrlStateUnsubscribe: (() => void) | null = null;

  constructor(options: OfficerTooltipOptions = {}) {
    this.options = options;
    this.root = document.createElement('div');
    this.root.className = 'officer-tooltip';
    this.root.setAttribute('role', 'tooltip');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.addEventListener('mouseenter', () => this.cancelHide());
    this.root.addEventListener('mouseleave', () => this.scheduleHide(120));
    document.body.appendChild(this.root);

    // Listen for CTRL key state changes
    this.ctrlStateUnsubscribe = onCtrlStateChange((pressed) => {
      if (this.isHovering && this.currentTarget && this.currentOfficer) {
        if (pressed) {
          this.showTooltip(this.currentTarget, this.currentOfficer);
        } else {
          this.hide();
        }
      } else if (!pressed) {
        // Always hide tooltip when CTRL is released, even if not currently hovering
        this.hide();
      }
    });
  }

  private cancelHide(): void {
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private scheduleHide(delay = 80): void {
    this.cancelHide();
    this.hideTimer = window.setTimeout(() => this.hide(), delay);
  }

  private resolveRelations(officer: Officer): RelationWithName[] {
    return officer.relationships.map((relation) => ({
      ...relation,
      name: this.options.resolveName?.(relation.with)
    }));
  }

  private buildMemories(officer: Officer): string {
    if (!officer.memories || officer.memories.length === 0) {
      return '<p class="tooltip-empty">Keine Erinnerungen verzeichnet.</p>';
    }
    const latest = officer.memories.slice(-3).reverse();
    return `<ul class="tooltip-memories">${latest
      .map(
        (memory) =>
          `<li><span>${memory.cycle}</span><p>${memory.summary}${
            memory.details ? ` <small>${memory.details}</small>` : ''
          }</p></li>`
      )
      .join('')}</ul>`;
  }

  private render(officer: Officer): void {
    const archetype = deriveArchetype(officer);
    const title = deriveTitle(officer);
    const relations = this.resolveRelations(officer);
    const relationList =
      relations.length > 0
        ? `<ul class="tooltip-relations">${relations
            .map((relation) => {
              const strength = relation.expiresAtCycle
                ? `bis Zyklus ${relation.expiresAtCycle}`
                : 'stabil';
              return `<li><span class="icon">${
                RELATION_ICONS[relation.type]
              }</span><span><strong>${relationLabel(relation)}</strong>${
                relation.name ? ` mit ${relation.name}` : ''
              }<small>${strength}</small></span></li>`;
            })
            .join('')}</ul>`
        : '<p class="tooltip-empty">Keine bekannten Bande.</p>';
    const traits =
      officer.traits.length > 0
        ? officer.traits
            .map((trait) => `<span class="tooltip-badge">${trait}</span>`)
            .join('')
        : '<span class="tooltip-badge tooltip-badge--muted">Kein Merkmal</span>';
    this.root.innerHTML = `
      <header>
        <div class="tooltip-heading">
          <h2>${officer.name}</h2>
          <span class="sub">Lv ${officer.stats.level} • ${title}</span>
          <span class="archetype">${archetype}</span>
        </div>
        <div class="tooltip-traits">${traits}</div>
      </header>
      <section class="tooltip-stats">
        <dl>
          <div><dt>STR</dt><dd>${officer.stats.str}</dd></div>
          <div><dt>DEX</dt><dd>${officer.stats.dex}</dd></div>
          <div><dt>INT</dt><dd>${officer.stats.int}</dd></div>
          <div><dt>HP</dt><dd>${officer.stats.hp}/${officer.stats.maxHp}</dd></div>
          ${officer.mood.loyalitaet !== undefined ? `<div><dt>Loyalität</dt><dd>${Math.round(officer.mood.loyalitaet)}%</dd></div>` : ''}
        </dl>
      </section>
      <section class="tooltip-relations-section">
        <h3>Beziehungen</h3>
        ${relationList}
      </section>
      <section class="tooltip-mem-section">
        <h3>Erinnerungen</h3>
        ${this.buildMemories(officer)}
      </section>
      <footer>
        <button type="button" data-action="invite">Warcall einladen</button>
        <button type="button" data-action="rival">Als Rival markieren</button>
        <button type="button" data-action="details">Details öffnen</button>
      </footer>
    `;
    this.root
      .querySelector('[data-action="invite"]')
      ?.addEventListener('click', () => this.options.onInvite?.(officer));
    this.root
      .querySelector('[data-action="rival"]')
      ?.addEventListener('click', () => this.options.onMarkRival?.(officer));
    this.root
      .querySelector('[data-action="details"]')
      ?.addEventListener('click', () => this.options.onOpenDetails?.(officer));
  }

  show(target: HTMLElement, officer: Officer): void {
    this.isHovering = true;
    this.currentTarget = target;
    this.currentOfficer = officer;

    // Only show tooltip if CTRL is pressed
    if (isCtrlKeyPressed()) {
      this.showTooltip(target, officer);
    }
  }

  private showTooltip(target: HTMLElement, officer: Officer): void {
    this.cancelHide();
    this.render(officer);
    const id = `tooltip-${officer.id}`;
    this.root.id = id;
    target.setAttribute('aria-describedby', id);
    const { top, left, width } = target.getBoundingClientRect();
    const tooltipRect = this.root.getBoundingClientRect();
    const y = top + window.scrollY - tooltipRect.height - 12;
    const x = left + window.scrollX + width / 2 - tooltipRect.width / 2;
    this.root.style.left = `${Math.max(12, x)}px`;
    this.root.style.top = `${Math.max(12, y)}px`;
    this.root.setAttribute('aria-hidden', 'false');
    this.root.classList.add('is-visible');
    if (typeof this.root.animate === 'function') {
      this.root.animate(
        [
          { opacity: 0, transform: 'translateY(4px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ],
        { duration: 12, easing: 'linear' }
      );
    }
  }

  hide(): void {
    this.cancelHide();
    this.currentTarget?.removeAttribute('aria-describedby');

    // Clear all state immediately to prevent tooltip from reappearing incorrectly
    this.currentTarget = null;
    this.isHovering = false;
    this.currentOfficer = null;

    // Immediately remove visibility to prevent sticking, regardless of animation
    this.root.classList.remove('is-visible');
    this.root.setAttribute('aria-hidden', 'true');

    if (typeof this.root.animate === 'function') {
      this.root.animate(
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(4px)' }
        ],
        { duration: 80, easing: 'ease-out' }
      );
    }
  }

  scheduleHideFromTarget(): void {
    this.isHovering = false;
    this.currentTarget = null;
    this.currentOfficer = null;
    this.scheduleHide();
  }

  destroy(): void {
    if (this.ctrlStateUnsubscribe) {
      this.ctrlStateUnsubscribe();
      this.ctrlStateUnsubscribe = null;
    }
    this.root.remove();
  }
}
