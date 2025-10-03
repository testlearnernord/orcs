/**
 * OFFIZIERSANSICHT - Centralized draggable popup for officer details
 * Replaces the old bottom-panel DetailsPanel system
 */

import type { Officer, Relationship, PotentialRating } from '@sim/types';
import { AvatarView } from '@ui/officer/Avatar';
import { getTraitDescription } from '@sim/traits';
import { getExpForLevel, getCurrentExp } from '@sim/experience';

// Import archetype icons
import berserkerIcon from '@/assets/archetypes/berserker.svg';
import archerIcon from '@/assets/archetypes/archer.svg';
import trapperIcon from '@/assets/archetypes/trapper.svg';

export interface OfficerDetailsPopupOptions {
  resolveName?: (id: string) => string | undefined;
}

const RELATION_ICONS: Record<Relationship['type'], string> = {
  ALLY: '🤝',
  RIVAL: '⚔️'
};

const POTENTIAL_SLUG: Record<PotentialRating, string> = {
  Unbrauchbar: 'unusable',
  Dumm: 'dumb',
  Normal: 'normal',
  Fähig: 'capable',
  Überdurchschnittlich: 'above-average',
  Genie: 'genius'
};

const ARCHETYPE_ICONS: Record<string, string> = {
  Berserker: berserkerIcon,
  Archer: archerIcon,
  Trapper: trapperIcon
};

function relationLabel(relation: Relationship): string {
  switch (relation.type) {
    case 'ALLY':
      return 'Allianz';
    case 'RIVAL':
      return 'Rivalität';
    default:
      return relation.type;
  }
}

function deriveArchetype(officer: Officer): string {
  if (officer.traits.includes('Archer')) {
    return 'Archer';
  }
  if (officer.traits.includes('Trapper')) {
    return 'Trapper';
  }
  return 'Berserker';
}

function deriveTitle(officer: Officer): string {
  switch (officer.rank) {
    case 'König':
      return 'Herr der Horde';
    case 'Spieler':
      return 'Kriegsrat';
    case 'Captain':
      return 'Kapitän';
    case 'Späher':
      return 'Späher';
    default:
      return 'Grunzer';
  }
}

/**
 * Derives what the officer plans to do in the next cycle
 * based on their current state, rank, and ambition
 */
function deriveNextGoal(officer: Officer): string {
  // Low HP - needs to regenerate
  const hpPercent = (officer.stats.hp / officer.stats.maxHp) * 100;
  if (hpPercent < 50) {
    return 'Regenerieren (LP wiederherstellen)';
  }

  // Very ambitious officers with specific goals
  const ambition = officer.mood.ambition.toLowerCase();
  
  // König-specific goals
  if (officer.rank === 'König') {
    if (ambition.includes('rivalen') || ambition.includes('eliminieren')) {
      return 'Rivalen überwachen';
    }
    if (ambition.includes('captains') || ambition.includes('loyale')) {
      return 'Captains koordinieren';
    }
    if (ambition.includes('horde') || ambition.includes('stärksten')) {
      return 'Warcall planen';
    }
    return 'Herrschaft sichern';
  }

  // High potential or ambitious officers
  if (
    ambition.includes('könig') ||
    ambition.includes('herausfordern') ||
    ambition.includes('captain')
  ) {
    // Randomly choose between combat-oriented goals
    const goals = [
      'Warcall initiieren',
      'Herausforderer suchen',
      'Verdeckte Aktion',
      'Rivalen beobachten'
    ];
    // Use officer ID for deterministic "random" selection
    const index = officer.id.length % goals.length;
    return goals[index];
  }

  // Low HP or defensive officers
  if (ambition.includes('überleben') || ambition.includes('nicht der schwächste')) {
    return 'Training und Vorbereitung';
  }

  // Relationship-focused officers
  if (ambition.includes('verbündete') || ambition.includes('allianzen')) {
    return 'Beziehungen pflegen';
  }

  // Officers looking to prove themselves
  if (ambition.includes('beweisen') || ambition.includes('aufsteigen')) {
    const goals = [
      'An Warcall teilnehmen',
      'Stärke demonstrieren',
      'Merit sammeln',
      'Training'
    ];
    const index = (officer.stats.level + officer.merit) % goals.length;
    return goals[index];
  }

  // Default goals based on rank
  switch (officer.rank) {
    case 'Captain':
      return 'Warcall vorbereiten';
    case 'Späher':
      return 'Patrouille durchführen';
    case 'Grunzer':
      return 'Ausbildung fortsetzen';
    default:
      return 'Bereit zum Einsatz';
  }
}


export class OfficerDetailsPopup {
  private container: HTMLElement | null = null;
  private dragHandle: HTMLElement | null = null;
  private closeButton: HTMLButtonElement | null = null;
  private contentContainer: HTMLElement | null = null;
  private portraitContainer: HTMLElement | null = null;
  private avatarView: AvatarView | null = null;
  private readonly options: OfficerDetailsPopupOptions;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private currentOfficer: Officer | null = null;

  constructor(options: OfficerDetailsPopupOptions = {}) {
    this.options = options;
  }

  show(officer: Officer): void {
    this.currentOfficer = officer;

    if (!this.container) {
      this.createPopup();
    }

    this.renderOfficerDetails(officer);

    if (this.container) {
      this.container.style.display = 'flex';
      // Center popup on screen
      this.centerPopup();
    }
  }

  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.currentOfficer = null;
  }

  private centerPopup(): void {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const x = (window.innerWidth - rect.width) / 2;
    const y = (window.innerHeight - rect.height) / 2;
    this.container.style.left = `${Math.max(0, x)}px`;
    this.container.style.top = `${Math.max(0, y)}px`;
  }

  private createPopup(): void {
    // Remove any existing popup
    document.querySelectorAll('.officer-details-popup').forEach((el) => el.remove());

    this.container = document.createElement('div');
    this.container.className = 'officer-details-popup';
    this.container.style.display = 'none';

    const backdrop = document.createElement('div');
    backdrop.className = 'officer-details-popup__backdrop';
    backdrop.addEventListener('click', () => this.hide());

    const dialog = document.createElement('div');
    dialog.className = 'officer-details-popup__dialog';
    dialog.addEventListener('click', (e) => e.stopPropagation());

    this.dragHandle = document.createElement('div');
    this.dragHandle.className = 'officer-details-popup__header';
    this.dragHandle.innerHTML = `
      <div class="officer-details-popup__title">
        <span class="officer-details-popup__icon">🔍</span>
        <h2>OFFIZIERSANSICHT</h2>
      </div>
    `;

    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.className = 'officer-details-popup__close';
    this.closeButton.innerHTML = '×';
    this.closeButton.addEventListener('click', () => this.hide());
    this.dragHandle.appendChild(this.closeButton);

    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'officer-details-popup__content';

    dialog.appendChild(this.dragHandle);
    dialog.appendChild(this.contentContainer);

    this.container.appendChild(backdrop);
    this.container.appendChild(dialog);
    document.body.appendChild(this.container);

    // Setup dragging
    this.setupDragging(dialog);
  }

  private setupDragging(dialog: HTMLElement): void {
    if (!this.dragHandle) return;

    const handleMouseDown = (e: MouseEvent): void => {
      if (e.target === this.closeButton || this.closeButton?.contains(e.target as Node)) {
        return;
      }
      this.isDragging = true;
      const rect = dialog.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      dialog.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent): void => {
      if (!this.isDragging) return;
      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;
      dialog.style.left = `${x}px`;
      dialog.style.top = `${y}px`;
      dialog.style.transform = 'none'; // Remove any transform when dragging
    };

    const handleMouseUp = (): void => {
      if (this.isDragging) {
        this.isDragging = false;
        dialog.style.cursor = '';
      }
    };

    this.dragHandle.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    this.dragHandle.style.cursor = 'grab';
  }

  private resolveRelations(
    officer: Officer
  ): Array<Relationship & { name?: string }> {
    return officer.relationships.map((relation) => ({
      ...relation,
      name: this.options.resolveName?.(relation.with)
    }));
  }

  private buildMemories(officer: Officer): string {
    if (!officer.memories || officer.memories.length === 0) {
      return '<p class="details-empty">Keine Erinnerungen verzeichnet.</p>';
    }
    const latest = officer.memories.slice(-5).reverse();
    return `<ul class="details-memories">${latest
      .map(
        (memory) =>
          `<li><span class="memory-cycle">Zyklus ${memory.cycle}</span><p class="memory-text">${memory.summary}${
            memory.details ? ` <small>${memory.details}</small>` : ''
          }</p></li>`
      )
      .join('')}</ul>`;
  }

  private renderOfficerDetails(officer: Officer): void {
    if (!this.contentContainer) return;

    const archetype = deriveArchetype(officer);
    const title = deriveTitle(officer);
    const relations = this.resolveRelations(officer);

    const relationList =
      relations.length > 0
        ? `<ul class="details-relations">${relations
            .map((relation) => {
              const strength = relation.expiresAtCycle
                ? `bis Zyklus ${relation.expiresAtCycle}`
                : 'stabil';
              return `<li><span class="relation-icon">${
                RELATION_ICONS[relation.type]
              }</span><span class="relation-info"><strong>${relationLabel(relation)}</strong>${
                relation.name ? ` mit ${relation.name}` : ''
              } <small>${strength}</small></span></li>`;
            })
            .join('')}</ul>`
        : '<p class="details-empty">Keine bekannten Bande.</p>';

    const traits =
      officer.traits.length > 0
        ? officer.traits
            .map(
              (trait) =>
                `<span class="details-badge" title="${getTraitDescription(trait)}">${trait}</span>`
            )
            .join('')
        : '<span class="details-badge details-badge--muted">Keine Merkmale</span>';

    // Get archetype icon path
    const archetypeIconPath = ARCHETYPE_ICONS[archetype];

    // Calculate experience progress
    const currentExp = getCurrentExp(officer);
    const currentLevelExp = getExpForLevel(officer.stats.level);
    const nextLevelExp = getExpForLevel(officer.stats.level + 1);
    const expInLevel = currentExp - currentLevelExp;
    const expNeeded = nextLevelExp - currentLevelExp;
    const expPercent = Math.min(100, Math.round((expInLevel / expNeeded) * 100));

    // Derive next goal
    const nextGoal = deriveNextGoal(officer);

    // Clean up old avatar if exists
    if (this.avatarView) {
      this.avatarView.destroy();
      this.avatarView = null;
    }

    this.contentContainer.innerHTML = `
      <div class="officer-details-popup__profile">
        <div class="officer-details-popup__portrait-wrapper"></div>
        <div class="officer-details-popup__info">
          <h3>${officer.name}</h3>
          <span class="details-subtitle">Lv ${officer.stats.level} • ${title} • ${archetype}</span>
          <div class="details-traits">${traits}</div>
        </div>
        ${
          archetypeIconPath
            ? `<img src="${archetypeIconPath}" alt="${archetype} Icon" class="officer-details-popup__archetype-icon" title="${archetype.toUpperCase()}" />`
            : ''
        }
      </div>
      <div class="details-stats">
        <h4>Attribute</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Potential</span>
            <span class="stat-value stat-value--potential" data-potential="${POTENTIAL_SLUG[officer.stats.potential]}">${officer.stats.potential}</span>
          </div>
          <div class="stat-item stat-item--animated">
            <span class="stat-label">Lebenspunkte</span>
            <div class="stat-bar">
              <div class="stat-fill" style="width: ${Math.round((officer.stats.hp / officer.stats.maxHp) * 100)}%"></div>
            </div>
            <span class="stat-value">${officer.stats.hp}/${officer.stats.maxHp}</span>
          </div>
          <div class="stat-item stat-item--animated">
            <span class="stat-label">Stärke</span>
            <div class="stat-bar">
              <div class="stat-fill" style="width: ${Math.min(100, Math.round((officer.stats.str / 100) * 100))}%"></div>
            </div>
            <span class="stat-value">${officer.stats.str}</span>
          </div>
          <div class="stat-item stat-item--animated">
            <span class="stat-label">Geschicklichkeit</span>
            <div class="stat-bar">
              <div class="stat-fill" style="width: ${Math.min(100, Math.round((officer.stats.dex / 100) * 100))}%"></div>
            </div>
            <span class="stat-value">${officer.stats.dex}</span>
          </div>
          <div class="stat-item stat-item--animated">
            <span class="stat-label">Intelligenz</span>
            <div class="stat-bar">
              <div class="stat-fill" style="width: ${Math.min(100, Math.round((officer.stats.int / 100) * 100))}%"></div>
            </div>
            <span class="stat-value">${officer.stats.int}</span>
          </div>
          <div class="stat-item stat-item--animated">
            <span class="stat-label">Erfahrungspunkte</span>
            <div class="stat-bar">
              <div class="stat-fill" style="width: ${expPercent}%"></div>
            </div>
            <span class="stat-value">${currentExp}/${nextLevelExp}</span>
          </div>
          ${
            officer.mood.loyalitaet !== undefined
              ? `
          <div class="stat-item">
            <span class="stat-label">Loyalität</span>
            <span class="stat-value">${Math.round(officer.mood.loyalitaet)}%</span>
          </div>`
              : ''
          }
          <div class="stat-item">
            <span class="stat-label">Ambition</span>
            <span class="stat-value">${officer.mood.ambition}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Nächstes Ziel</span>
            <span class="stat-value">${nextGoal}</span>
          </div>
        </div>
      </div>
      <div class="details-relations-section">
        <h4>Beziehungen</h4>
        ${relationList}
      </div>
      <div class="details-memories-section">
        <h4>Erinnerungen</h4>
        ${this.buildMemories(officer)}
      </div>
    `;

    // Add portrait using AvatarView
    this.portraitContainer = this.contentContainer.querySelector(
      '.officer-details-popup__portrait-wrapper'
    ) as HTMLElement;

    if (this.portraitContainer) {
      this.avatarView = new AvatarView({
        officer,
        size: 128,
        className: 'officer-details-popup__portrait',
        title: officer.name
      });
      this.portraitContainer.appendChild(this.avatarView.element);
    }
  }

  destroy(): void {
    if (this.avatarView) {
      this.avatarView.destroy();
      this.avatarView = null;
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.dragHandle = null;
    this.closeButton = null;
    this.contentContainer = null;
    this.portraitContainer = null;
    this.currentOfficer = null;
  }
}
