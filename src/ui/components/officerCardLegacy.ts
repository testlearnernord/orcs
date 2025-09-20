import { getPortraitAsset } from '@sim/portraits';
import type { Officer } from '@sim/types';
import type { OfficerTooltip } from '@ui/components/officerTooltip';
import { measure, flip } from '@ui/utils/flip';

export interface OfficerCardLegacyOptions {
  tooltip: OfficerTooltip;
  onOpenDetails?: (officer: Officer) => void;
}

type StatKey = keyof Officer['personality'];

const STATS: StatKey[] = ['gier', 'tapferkeit', 'loyalitaet', 'stolz'];

const STAT_LABEL: Record<StatKey, string> = {
  gier: 'Gier',
  tapferkeit: 'Tapferkeit',
  loyalitaet: 'Loyalität',
  stolz: 'Stolz'
};

export class OfficerCardLegacy {
  readonly element: HTMLElement;
  private readonly options: OfficerCardLegacyOptions;
  private officer: Officer;
  private readonly statBars = new Map<StatKey, HTMLDivElement>();
  private readonly statValues = new Map<StatKey, HTMLElement>();
  private readonly traitContainer: HTMLElement;
  private readonly subtitle: HTMLElement;
  private readonly portrait: HTMLImageElement;
  private readonly badges: HTMLElement;
  private readonly meritBadge: HTMLElement;
  private readonly levelBadge: HTMLElement;
  private previousRect: DOMRect | null = null;

  constructor(officer: Officer, options: OfficerCardLegacyOptions) {
    this.officer = officer;
    this.options = options;
    this.element = document.createElement('article');
    this.element.className = 'officer-card';
    this.element.tabIndex = 0;
    this.element.dataset.officerId = officer.id;

    const portraitWrapper = document.createElement('div');
    portraitWrapper.className = 'officer-card__portrait';
    this.portrait = document.createElement('img');
    this.portrait.alt = officer.name;
    this.portrait.src = getPortraitAsset(officer.portraitSeed);
    portraitWrapper.appendChild(this.portrait);

    const body = document.createElement('div');
    body.className = 'officer-card__body';

    const header = document.createElement('div');
    header.className = 'officer-card__header';
    const title = document.createElement('h3');
    title.textContent = officer.name;
    this.subtitle = document.createElement('p');
    this.subtitle.className = 'officer-card__subtitle';
    header.appendChild(title);
    header.appendChild(this.subtitle);

    const badgeRow = document.createElement('div');
    badgeRow.className = 'officer-card__badge-row';
    this.levelBadge = document.createElement('span');
    this.levelBadge.className = 'officer-card__badge';
    this.meritBadge = document.createElement('span');
    this.meritBadge.className =
      'officer-card__badge officer-card__badge--muted';
    badgeRow.appendChild(this.levelBadge);
    badgeRow.appendChild(this.meritBadge);

    this.traitContainer = document.createElement('div');
    this.traitContainer.className = 'officer-card__traits';

    const statsGrid = document.createElement('dl');
    statsGrid.className = 'officer-card__stats';
    STATS.forEach((key) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = STAT_LABEL[key];
      const dd = document.createElement('dd');
      const bar = document.createElement('div');
      bar.className = 'officer-card__bar';
      const fill = document.createElement('div');
      fill.className = 'officer-card__bar-fill';
      bar.appendChild(fill);
      const value = document.createElement('span');
      value.className = 'officer-card__stat-value';
      dd.appendChild(bar);
      dd.appendChild(value);
      row.appendChild(dt);
      row.appendChild(dd);
      statsGrid.appendChild(row);
      this.statBars.set(key, fill);
      this.statValues.set(key, value);
    });

    this.badges = document.createElement('div');
    this.badges.className = 'officer-card__relationship-badges';

    body.appendChild(header);
    body.appendChild(badgeRow);
    body.appendChild(this.traitContainer);
    body.appendChild(statsGrid);
    body.appendChild(this.badges);

    this.element.appendChild(portraitWrapper);
    this.element.appendChild(body);

    this.attachTooltipListeners();
    this.update(officer);
  }

  private attachTooltipListeners(): void {
    const { tooltip } = this.options;
    this.element.addEventListener('mouseenter', () => {
      tooltip.show(this.element, this.officer);
    });
    this.element.addEventListener('mouseleave', () => {
      tooltip.scheduleHideFromTarget();
    });
    this.element.addEventListener('focus', () => {
      tooltip.show(this.element, this.officer);
    });
    this.element.addEventListener('blur', () => tooltip.hide());
    this.element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.options.onOpenDetails?.(this.officer);
      }
    });
  }

  private updateBadges(officer: Officer): void {
    this.traitContainer.innerHTML = '';
    if (officer.traits.length === 0) {
      const badge = document.createElement('span');
      badge.className = 'officer-card__trait officer-card__trait--muted';
      badge.textContent = 'Keine Merkmale';
      this.traitContainer.appendChild(badge);
    } else {
      officer.traits.forEach((trait) => {
        const badge = document.createElement('span');
        badge.className = 'officer-card__trait';
        badge.textContent = trait;
        this.traitContainer.appendChild(badge);
      });
    }
  }

  private updateStats(officer: Officer, previous: Officer): void {
    STATS.forEach((key) => {
      const value = officer.personality[key];
      const fill = this.statBars.get(key);
      const text = this.statValues.get(key);
      if (!fill || !text) return;
      const percent = `${Math.round(value * 100)}%`;
      if (!fill.style.width) {
        fill.style.width = percent;
      } else {
        fill.style.setProperty('--target-width', percent);
        fill.classList.add('is-animating');
        requestAnimationFrame(() => {
          fill.style.width = percent;
          fill.addEventListener(
            'transitionend',
            () => fill.classList.remove('is-animating'),
            { once: true }
          );
        });
      }
      const previousValue = previous.personality[key];
      const delta = value - previousValue;
      text.textContent = value.toFixed(2);
      text.dataset.delta = delta !== 0 ? delta.toFixed(2) : '';
      text.classList.remove('is-up', 'is-down');
      if (delta > 0.01) {
        text.classList.add('is-up');
      } else if (delta < -0.01) {
        text.classList.add('is-down');
      }
    });
  }

  private updateRelationships(officer: Officer): void {
    this.badges.innerHTML = '';
    officer.relationships.slice(0, 4).forEach((relation) => {
      const span = document.createElement('span');
      span.className = `officer-card__rel officer-card__rel--${relation.type.toLowerCase()}`;
      span.textContent = relation.type;
      this.badges.appendChild(span);
    });
  }

  captureBounds(): void {
    this.previousRect = measure(this.element);
  }

  playFlip(): void {
    if (!this.previousRect) return;
    flip(this.element, this.previousRect);
    this.previousRect = null;
  }

  update(officer: Officer): void {
    const previous = this.officer;
    this.officer = officer;
    this.portrait.src = getPortraitAsset(officer.portraitSeed);
    this.portrait.alt = officer.name;
    this.subtitle.textContent = `${officer.rank} • Merit ${Math.round(officer.merit)}`;
    this.levelBadge.textContent = `Level ${officer.level}`;
    this.meritBadge.textContent = `Zyklus ${officer.cycleJoined}`;
    this.updateBadges(officer);
    this.updateStats(officer, previous);
    this.updateRelationships(officer);
  }
}
