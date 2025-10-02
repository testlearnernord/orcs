import type { Officer, RelationshipType } from '@sim/types';
import { measure, flip } from '@ui/utils/flip';
import { AvatarView } from '@ui/officer/Avatar';

export interface OfficerCardOptions {
  onOpenDetails?: (officer: Officer) => void;
  onOfficerClick?: (officer: Officer) => void; // New click handler for details panel
}

type StatKey = 'str' | 'dex' | 'int' | 'hp' | 'exp';

const STATS: StatKey[] = ['str', 'dex', 'int', 'hp', 'exp'];

const STAT_LABEL: Record<StatKey, string> = {
  str: 'Stärke',
  dex: 'Geschick',
  int: 'Intelligenz',
  hp: 'Lebenspunkte',
  exp: 'Erfahrung'
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

// Archetype icon paths
const ARCHETYPE_ICONS: Record<string, string> = {
  Berserker: '/assets/archetypes/berserker.png',
  Archer: '/assets/archetypes/archer.png',
  Trapper: '/assets/archetypes/trapper.png'
};

function deriveArchetype(officer: Officer): string {
  // Use primary trait to derive archetype, or default to Berserker
  if (officer.traits.includes('Archer')) {
    return 'Archer';
  }
  if (officer.traits.includes('Trapper')) {
    return 'Trapper';
  }
  return 'Berserker'; // Default archetype for officers without specific archetype traits
}

export class OfficerCard {
  readonly element: HTMLElement;
  private readonly options: OfficerCardOptions;
  private officer: Officer;
  private readonly avatar: AvatarView;
  private readonly archetypeIcon: HTMLImageElement;
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

    // Create container for portrait and archetype icon
    const portraitContainer = document.createElement('div');
    portraitContainer.className = 'officer-card__portrait-container';

    const portraitWrapper = document.createElement('div');
    portraitWrapper.className = 'officer-card__portrait';
    this.avatar = new AvatarView({
      officer,
      size: 96,
      className: 'officer-card__portrait-img',
      title: officer.name
    });
    portraitWrapper.appendChild(this.avatar.element);

    // Add archetype icon below portrait
    this.archetypeIcon = document.createElement('img');
    this.archetypeIcon.className = 'officer-card__archetype-icon';
    
    portraitContainer.appendChild(portraitWrapper);
    portraitContainer.appendChild(this.archetypeIcon);

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

    this.element.append(portraitContainer, content);
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

  private updateArchetypeIcon(officer: Officer): void {
    const archetype = deriveArchetype(officer);
    const iconPath = ARCHETYPE_ICONS[archetype];
    if (iconPath) {
      this.archetypeIcon.src = iconPath;
      this.archetypeIcon.alt = `${archetype} Icon`;
      this.archetypeIcon.title = archetype;
      this.element.dataset.archetype = archetype.toLowerCase();
    }
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
    const displayTraits = officer.traits.filter(
      (trait) => trait !== 'Archer' && trait !== 'Trapper'
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
      } else if (
        ['Nobel', 'Primitiv', 'Freundlich', 'Unfreundlich'].includes(trait)
      ) {
        chip.classList.add('officer-card__trait--social');
      } else if (['Dumm', 'Schlau', 'Weise'].includes(trait)) {
        chip.classList.add('officer-card__trait--mental');
      } else if (
        [
          'Guter Schütze',
          'Schlechter Schütze',
          'Axtexperte',
          'Zweihandtölpel',
          'Jäger',
          'Fliegenfänger'
        ].includes(trait)
      ) {
        chip.classList.add('officer-card__trait--combat');
      }

      this.traitContainer.appendChild(chip);
    });
  }

  private getTraitDescription(trait: string): string {
    const descriptions: Record<string, string> = {
      Robust: '+5% Lebenspunkte',
      Weich: '-5% Lebenspunkte',
      'lange Beine':
        '+10% Weltkarten-Geschwindigkeit, +5% Kampf-Geschwindigkeit',
      'kurze Beine':
        '-10% Weltkarten-Geschwindigkeit, -5% Kampf-Geschwindigkeit',
      Nobel: '+15% Merit, andere Offiziere sind loyaler',
      Primitiv: '-15% Merit, andere Offiziere sind unloyaler',
      Freundlich: 'Geht gerne Allianzen ein, ist loyaler',
      Unfreundlich: 'Geht gerne Rivalitäten ein, ist unloyaler',
      Dumm: '-25% Erfahrungsgewinn',
      Schlau: '+25% Erfahrungsgewinn',
      Weise: 'Mehr Attributpunkte bei Stufenaufstieg',
      Verräter: 'Verrät andere für eigenen Vorteil',
      'Guter Schütze': '+25% Fernkampf-Schaden (nur Bogenschützen)',
      'Schlechter Schütze': '-25% Fernkampf-Schaden (nur Bogenschützen)',
      Axtexperte: '+25% Zweihand-Schaden (nur Berserker)',
      Zweihandtölpel: '-25% Zweihand-Schaden (nur Berserker)',
      Jäger: '+25% Fallen-Schaden (nur Fallensteller)',
      Fliegenfänger: '-25% Fallen-Schaden (nur Fallensteller)'
    };

    return descriptions[trait] || 'Unbekannte Eigenschaft';
  }

  /**
   * Calculate experience required for a specific level
   */
  private getExpForLevel(level: number): number {
    // Simple exponential formula: level^2 * 100
    return level * level * 100;
  }

  /**
   * Calculate current experience and progress for an officer
   * Now based on actual gameplay events rather than random values
   */
  private getExpInfo(officer: Officer): {
    currentExp: number;
    nextLevelExp: number;
    progress: number;
    displayText: string;
  } {
    const currentLevel = officer.stats.level;
    const currentLevelExp = this.getExpForLevel(currentLevel);
    const nextLevelExp = this.getExpForLevel(currentLevel + 1);

    // Calculate actual experience based on gameplay metrics
    const baseExp = currentLevelExp;
    const bonusExp = this.calculateBonusExp(officer);
    const currentExp = baseExp + bonusExp;

    const expRange = nextLevelExp - currentLevelExp;
    const progress = Math.min(
      100,
      ((currentExp - currentLevelExp) / expRange) * 100
    );
    const displayText = `${Math.floor(currentExp)}/${nextLevelExp}`;

    return {
      currentExp: Math.floor(currentExp),
      nextLevelExp,
      progress: Math.max(0, progress),
      displayText
    };
  }

  /**
   * Calculate bonus experience based on officer performance and traits
   */
  private calculateBonusExp(officer: Officer): number {
    let bonusExp = 0;

    // Base experience from merit (successful actions earn both merit and exp)
    bonusExp += Math.floor(officer.merit * 0.8); // 80% of merit becomes exp

    // Level-based progression bonus
    bonusExp += (officer.stats.level - 1) * 150;

    // Trait-based experience modifiers
    if (officer.traits.includes('Schlau')) {
      bonusExp *= 1.25; // +25% exp for smart officers
    }
    if (officer.traits.includes('Dumm')) {
      bonusExp *= 0.75; // -25% exp for dumb officers
    }
    if (officer.traits.includes('Weise')) {
      bonusExp *= 1.1; // +10% exp for wise officers
    }

    // Rank-based experience scaling
    const rankMultipliers: Partial<Record<Officer['rank'], number>> = {
      König: 1.5,
      Captain: 1.3,
      Späher: 1.1,
      Grunzer: 1.0
    };
    bonusExp *= rankMultipliers[officer.rank] || 1.0;

    return Math.floor(bonusExp);
  }

  private updateStats(officer: Officer, previous: Officer): void {
    STATS.forEach((key) => {
      const fill = this.statBars.get(key);
      const text = this.statValues.get(key);
      if (!fill || !text) return;

      let displayValue: string;
      let percent: string;
      let delta = 0;

      if (key === 'exp') {
        // Handle EXP stat specially
        const expInfo = this.getExpInfo(officer);
        const prevExpInfo = this.getExpInfo(previous);

        displayValue = expInfo.displayText;
        percent = `${expInfo.progress}%`;
        delta = expInfo.currentExp - prevExpInfo.currentExp;

        // Level up detection - if level increased, show full progress
        if (officer.stats.level > previous.stats.level) {
          percent = '100%';
          delta = expInfo.nextLevelExp - prevExpInfo.currentExp; // Show large exp gain
        }
      } else if (key === 'hp') {
        const value = officer.stats[key];
        const previousValue = previous.stats[key];
        displayValue = `${value}/${officer.stats.maxHp}`;
        percent = `${Math.round((value / officer.stats.maxHp) * 100)}%`;
        delta = value - previousValue;
      } else {
        const value = officer.stats[key];
        const previousValue = previous.stats[key];
        displayValue = value.toString();
        // Scale other stats to percentage (assuming max around 100)
        percent = `${Math.min(100, Math.round((value / 100) * 100))}%`;
        delta = value - previousValue;
      }

      // Always animate stat bars for visual consistency
      if (
        !fill.style.width ||
        fill.style.width === '0' ||
        fill.style.width === '0%'
      ) {
        // Initial render: set width with double RAF to ensure painting
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fill.style.width = percent;
          });
        });
      } else {
        // Subsequent updates: animate with highlight effect
        fill.classList.add('is-animating');
        requestAnimationFrame(() => {
          fill.style.width = percent;
          const handle = () => fill.classList.remove('is-animating');
          fill.addEventListener('transitionend', handle, { once: true });
        });
      }

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
    this.element.classList.remove('has-rival-relation', 'has-ally-relation');
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
    this.updateArchetypeIcon(officer);
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
