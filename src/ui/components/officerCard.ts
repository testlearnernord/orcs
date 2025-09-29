import type { Officer, RelationshipType } from '@sim/types';
import { measure, flip } from '@ui/utils/flip';
import { AvatarView } from '@ui/officer/Avatar';

export interface OfficerCardOptions {
  onOpenDetails?: (officer: Officer) => void;
  onOfficerClick?: (officer: Officer) => void; // New click handler for details panel
}

type StatKey = 'str' | 'dex' | 'int' | 'hp';

const STATS: StatKey[] = ['str', 'dex', 'int', 'hp'];

const STAT_LABEL: Record<StatKey, string> = {
  str: 'Stärke',
  dex: 'Geschick',
  int: 'Intelligenz',
  hp: 'Lebenspunkte'
};

const RELATION_ORDER: RelationshipType[] = ['ALLY', 'RIVAL'];

// Redesign: Use German labels and icons as per issue #158
const RELATION_LABEL: Record<RelationshipType, string> = {
  ALLY: '🤝 Ally',
  RIVAL: '⚔️ Rivale'
};

const RELATION_CLASS: Record<RelationshipType, string> = {
  ALLY: 'ally',
  RIVAL: 'rival'
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
  private readonly avatar: AvatarView;
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
    this.element.dataset.status = officer.status === 'DEAD' ? 'dead' : 'active';

    const portraitWrapper = document.createElement('div');
    portraitWrapper.className = 'officer-card__portrait';
    this.avatar = new AvatarView({
      officer,
      size: 96,
      className: 'officer-card__portrait-img',
      title: officer.name
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
    this.attachClickListeners();
    this.update(officer);
  }

  private attachClickListeners(): void {
    // Add click handler to show officer details
    this.element.addEventListener('click', () => {
      this.options.onOfficerClick?.(this.officer);
    });

    // Keep keyboard support for accessibility
    this.element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.options.onOfficerClick?.(this.officer);
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
    this.levelBadge.textContent = `Lv. ${officer.stats.level}`;
    this.meritBadge.textContent = `Merit ${Math.round(officer.merit)}`;
    this.cycleBadge.textContent = `Zyklus ${officer.cycleJoined}`;
  }

  private updateTraits(officer: Officer): void {
    this.traitContainer.innerHTML = '';
    
    // Filter out archetype traits from display (they're shown separately as "Archer", "Trapper", etc.)
    const displayTraits = officer.traits.filter(trait => 
      trait !== 'Archer' && trait !== 'Trapper'
    );
    
    if (displayTraits.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'officer-card__trait officer-card__trait--muted';
      empty.textContent = 'Keine Merkmale';
      this.traitContainer.appendChild(empty);
      return;
    }
    
    displayTraits.forEach((trait) => {
      // Skip hidden traits like 'Geheimnisvoll'
      if (trait === 'Geheimnisvoll') return;
      
      const chip = document.createElement('span');
      chip.className = 'officer-card__trait';
      chip.textContent = trait;
      
      // Add tooltip with trait description
      chip.title = this.getTraitDescription(trait);
      
      // Add special styling for different trait types
      if (['Robust', 'Weich', 'lange Beine', 'kurze Beine'].includes(trait)) {
        chip.classList.add('officer-card__trait--physical');
      } else if (['Nobel', 'Primitiv', 'Freundlich', 'Unfreundlich'].includes(trait)) {
        chip.classList.add('officer-card__trait--social');
      } else if (['Dumm', 'Schlau', 'Weise'].includes(trait)) {
        chip.classList.add('officer-card__trait--mental');
      } else if (['Guter Schütze', 'Schlechter Schütze', 'Axtexperte', 'Zweihandtölpel', 'Jäger', 'Fliegenfänger'].includes(trait)) {
        chip.classList.add('officer-card__trait--combat');
      }
      
      this.traitContainer.appendChild(chip);
    });
  }
  
  private getTraitDescription(trait: string): string {
    const descriptions: Record<string, string> = {
      'Robust': '+5% Lebenspunkte',
      'Weich': '-5% Lebenspunkte',
      'lange Beine': '+10% Weltkarten-Geschwindigkeit, +5% Kampf-Geschwindigkeit',
      'kurze Beine': '-10% Weltkarten-Geschwindigkeit, -5% Kampf-Geschwindigkeit',
      'Nobel': '+15% Merit, andere Offiziere sind loyaler',
      'Primitiv': '-15% Merit, andere Offiziere sind unloyaler',
      'Freundlich': 'Geht gerne Allianzen ein, ist loyaler',
      'Unfreundlich': 'Geht gerne Rivalitäten ein, ist unloyaler',
      'Dumm': '-25% Erfahrungsgewinn',
      'Schlau': '+25% Erfahrungsgewinn',
      'Weise': 'Mehr Attributpunkte bei Stufenaufstieg',
      'Verräter': 'Verrät andere für eigenen Vorteil',
      'Guter Schütze': '+25% Fernkampf-Schaden (nur Bogenschützen)',
      'Schlechter Schütze': '-25% Fernkampf-Schaden (nur Bogenschützen)',
      'Axtexperte': '+25% Zweihand-Schaden (nur Berserker)',
      'Zweihandtölpel': '-25% Zweihand-Schaden (nur Berserker)',
      'Jäger': '+25% Fallen-Schaden (nur Fallensteller)',
      'Fliegenfänger': '-25% Fallen-Schaden (nur Fallensteller)'
    };
    
    return descriptions[trait] || 'Unbekannte Eigenschaft';
  }

  private updateStats(officer: Officer, previous: Officer): void {
    STATS.forEach((key) => {
      const value = officer.stats[key];
      const previousValue = previous.stats[key];
      const fill = this.statBars.get(key);
      const text = this.statValues.get(key);
      if (!fill || !text) return;

      // For HP, show as HP/MaxHP, for others show raw value
      let displayValue: string;
      let percent: string;

      if (key === 'hp') {
        displayValue = `${value}/${officer.stats.maxHp}`;
        percent = `${Math.round((value / officer.stats.maxHp) * 100)}%`;
      } else {
        displayValue = value.toString();
        // Scale other stats to percentage (assuming max around 100)
        percent = `${Math.min(100, Math.round((value / 100) * 100))}%`;
      }

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
      text.textContent = displayValue;
      text.dataset.delta =
        delta !== 0 ? (delta > 0 ? `+${delta}` : delta.toString()) : '';
      text.classList.remove('is-up', 'is-down');
      if (delta > 0) {
        text.classList.add('is-up');
      } else if (delta < 0) {
        text.classList.add('is-down');
      }
    });
  }

  private updateRelationships(officer: Officer): void {
    const counts = new Map<RelationshipType, number>();
    officer.relationships.forEach((relation) => {
      counts.set(relation.type, (counts.get(relation.type) ?? 0) + 1);
    });

    // Add relationship border styling to card (redesign requirement)
    this.element.classList.remove(
      'has-rival-relation',
      'has-ally-relation'
    );
    if (counts.get('RIVAL')) {
      this.element.classList.add('has-rival-relation');
    } else if (counts.get('ALLY')) {
      this.element.classList.add('has-ally-relation');
    }

    this.footer.innerHTML = '';
    RELATION_ORDER.forEach((type) => {
      const count = counts.get(type);
      if (!count) return;
      const pill = document.createElement('span');
      pill.className = `officer-card__status officer-card__status--${RELATION_CLASS[type]}`;
      pill.textContent = `${RELATION_LABEL[type]} · ${count}`;
      this.footer.appendChild(pill);
    });
    // Remove "Keine Bindungen" text completely as per requirements
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
    this.element.dataset.status = officer.status === 'DEAD' ? 'dead' : 'active';
    this.setRank(officer.rank);
    this.avatar.update({
      officer,
      size: 96,
      className: 'officer-card__portrait-img',
      title: officer.name
    });
    this.updateMeta(officer);
    this.updateTraits(officer);
    this.updateRelationships(officer);
    this.updateStats(officer, previous);
  }
}
