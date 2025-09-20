import type { Officer, RelationshipType } from '@sim/types';
import type { OfficerTooltip } from '@ui/components/officerTooltip';
import { measure, flip } from '@ui/utils/flip';
import Avatar from '@ui/officer/Avatar';
import { rankToRingColor } from '@ui/utils/rankColors';

export interface OfficerCardOptions {
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

const RELATION_ORDER: RelationshipType[] = [
  'ALLY',
  'FRIEND',
  'RIVAL',
  'BLOOD_OATH'
];

const RELATION_LABEL: Record<RelationshipType, string> = {
  ALLY: 'ALLY',
  FRIEND: 'FRIEND',
  RIVAL: 'RIVAL',
  BLOOD_OATH: 'BLOODOATH'
};

const RELATION_CLASS: Record<RelationshipType, string> = {
  ALLY: 'ally',
  FRIEND: 'friend',
  RIVAL: 'rival',
  BLOOD_OATH: 'blood'
};

type RankSlug = 'king' | 'player' | 'captain' | 'scout' | 'grunt';

const RANK_SLUG: Record<Officer['rank'], RankSlug> = {
  König: 'king',
  Spieler: 'player',
  Captain: 'captain',
  Späher: 'scout',
  Grunzer: 'grunt'
};

export class OfficerCard {
  readonly element: HTMLElement;
  private readonly options: OfficerCardOptions;
  private officer: Officer;
  private readonly avatar: Avatar;
  private readonly nameEl: HTMLHeadingElement;
  private readonly levelBadge: HTMLElement;
  private readonly rankBadge: HTMLElement;
  private readonly meritBadge: HTMLElement;
  private readonly cycleBadge: HTMLElement;
  private readonly traitContainer: HTMLElement;
  private readonly footer: HTMLElement;
  private readonly statBars = new Map<StatKey, HTMLDivElement>();
  private readonly statValues = new Map<StatKey, HTMLElement>();
  private previousRect: DOMRect | null = null;

  constructor(officer: Officer, options: OfficerCardOptions) {
    this.options = options;
    this.officer = officer;
    this.element = document.createElement('article');
    this.element.className = 'officer-card';
    this.element.tabIndex = 0;
    this.element.dataset.officerId = officer.id;

    const portraitWrapper = document.createElement('div');
    portraitWrapper.className = 'officer-card__portrait';
    this.avatar = new Avatar({
      officer,
      size: 96,
      ringColor: rankToRingColor(officer.rank),
      dead: officer.status === 'DEAD',
      className: 'officer-card__portrait-img'
    });
    portraitWrapper.appendChild(this.avatar.element);

    const content = document.createElement('div');
    content.className = 'officer-card__content';

    const header = document.createElement('header');
    header.className = 'officer-card__header';

    const titleRow = document.createElement('div');
    titleRow.className = 'officer-card__title-row';
    this.nameEl = document.createElement('h3');
    this.nameEl.textContent = officer.name;
    this.levelBadge = document.createElement('span');
    this.levelBadge.className = 'officer-card__level';
    titleRow.appendChild(this.nameEl);
    titleRow.appendChild(this.levelBadge);

    const metaRow = document.createElement('div');
    metaRow.className = 'officer-card__meta';
    this.rankBadge = document.createElement('span');
    this.rankBadge.className = 'officer-card__role';
    this.meritBadge = document.createElement('span');
    this.meritBadge.className = 'officer-card__badge';
    this.cycleBadge = document.createElement('span');
    this.cycleBadge.className =
      'officer-card__badge officer-card__badge--muted';
    metaRow.append(this.rankBadge, this.meritBadge, this.cycleBadge);

    header.append(titleRow, metaRow);
    content.appendChild(header);

    this.traitContainer = document.createElement('div');
    this.traitContainer.className = 'officer-card__traits';
    content.appendChild(this.traitContainer);

    const stats = document.createElement('div');
    stats.className = 'officer-card__stats';
    STATS.forEach((key) => {
      const row = document.createElement('div');
      row.className = 'officer-card__stat';
      const label = document.createElement('span');
      label.className = 'officer-card__stat-label';
      label.textContent = STAT_LABEL[key];
      const bar = document.createElement('div');
      bar.className = 'officer-card__stat-bar';
      const fill = document.createElement('div');
      fill.className = 'officer-card__stat-fill';
      bar.appendChild(fill);
      const value = document.createElement('span');
      value.className = 'officer-card__stat-value';
      row.append(label, bar, value);
      stats.appendChild(row);
      this.statBars.set(key, fill);
      this.statValues.set(key, value);
    });
    content.appendChild(stats);

    this.footer = document.createElement('footer');
    this.footer.className = 'officer-card__footer';
    content.appendChild(this.footer);

    this.element.append(portraitWrapper, content);
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

  private setRank(rank: Officer['rank']): void {
    const slug = RANK_SLUG[rank];
    this.element.dataset.rank = slug;
    this.rankBadge.textContent = rank;
  }

  private updateMeta(officer: Officer): void {
    this.nameEl.textContent = officer.name;
    this.levelBadge.textContent = `Lv. ${officer.level}`;
    this.meritBadge.textContent = `Merit ${Math.round(officer.merit)}`;
    this.cycleBadge.textContent = `Zyklus ${officer.cycleJoined}`;
  }

  private updateTraits(officer: Officer): void {
    this.traitContainer.innerHTML = '';
    if (officer.traits.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'officer-card__trait officer-card__trait--muted';
      empty.textContent = 'Keine Merkmale';
      this.traitContainer.appendChild(empty);
      return;
    }
    officer.traits.forEach((trait) => {
      const chip = document.createElement('span');
      chip.className = 'officer-card__trait';
      chip.textContent = trait;
      this.traitContainer.appendChild(chip);
    });
  }

  private updateStats(officer: Officer, previous: Officer): void {
    STATS.forEach((key) => {
      const value = officer.personality[key];
      const previousValue = previous.personality[key];
      const fill = this.statBars.get(key);
      const text = this.statValues.get(key);
      if (!fill || !text) return;
      const percent = `${Math.round(value * 100)}%`;
      if (!fill.style.width) {
        fill.style.width = percent;
      } else {
        fill.classList.add('is-animating');
        requestAnimationFrame(() => {
          fill.style.width = percent;
          const handle = () => fill.classList.remove('is-animating');
          fill.addEventListener('transitionend', handle, { once: true });
        });
      }
      const delta = value - previousValue;
      text.textContent = value.toFixed(2);
      text.dataset.delta =
        delta !== 0
          ? delta > 0
            ? `+${delta.toFixed(2)}`
            : delta.toFixed(2)
          : '';
      text.classList.remove('is-up', 'is-down');
      if (delta > 0.01) {
        text.classList.add('is-up');
      } else if (delta < -0.01) {
        text.classList.add('is-down');
      }
    });
  }

  private updateRelationships(officer: Officer): void {
    const counts = new Map<RelationshipType, number>();
    officer.relationships.forEach((relation) => {
      counts.set(relation.type, (counts.get(relation.type) ?? 0) + 1);
    });
    this.footer.innerHTML = '';
    RELATION_ORDER.forEach((type) => {
      const count = counts.get(type);
      if (!count) return;
      const pill = document.createElement('span');
      pill.className = `officer-card__status officer-card__status--${RELATION_CLASS[type]}`;
      pill.textContent = `${RELATION_LABEL[type]} · ${count}`;
      this.footer.appendChild(pill);
    });
    if (this.footer.childElementCount === 0) {
      const empty = document.createElement('span');
      empty.className = 'officer-card__status officer-card__status--empty';
      empty.textContent = 'Keine Bindungen';
      this.footer.appendChild(empty);
    }
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
    this.element.dataset.officerId = officer.id;
    this.setRank(officer.rank);
    this.avatar.update({
      officer,
      size: 96,
      ringColor: rankToRingColor(officer.rank),
      dead: officer.status === 'DEAD',
      className: 'officer-card__portrait-img'
    });
    this.updateMeta(officer);
    this.updateTraits(officer);
    this.updateRelationships(officer);
    this.updateStats(officer, previous);
  }
}
