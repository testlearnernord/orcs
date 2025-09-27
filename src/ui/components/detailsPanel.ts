/**
 * Officer Details Panel - Simple bottom interface details system
 * Replaces the buggy tooltip system with a cleaner checkbox-based approach
 */

import type { Officer, Relationship } from '@sim/types';

export interface DetailsPanelOptions {
  resolveName?: (id: string) => string | undefined;
}

const RELATION_ICONS: Record<Relationship['type'], string> = {
  ALLY: '🤝',
  FRIEND: '🍻',
  RIVAL: '⚔️',
  BLOOD_OATH: '🩸'
};

function relationLabel(relation: Relationship): string {
  switch (relation.type) {
    case 'ALLY':
      return 'Allianz';
    case 'FRIEND':
      return 'Freundschaft';
    case 'RIVAL':
      return 'Rivalität';
    case 'BLOOD_OATH':
      return 'Blutschwur';
    default:
      return relation.type;
  }
}

function formatStat(value: number): string {
  return value.toFixed(2);
}

function deriveArchetype(officer: Officer): string {
  const { personality } = officer;
  const dominant = Object.entries(personality).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];
  switch (dominant) {
    case 'tapferkeit':
      return 'Frontkrieger';
    case 'gier':
      return 'Plünderer';
    case 'loyalitaet':
      return 'Bannerträger';
    case 'stolz':
      return 'Championsgeist';
    default:
      return 'Unbekannt';
  }
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

export class DetailsPanel {
  private container: HTMLElement | null = null;
  private checkbox: HTMLInputElement | null = null;
  private detailsContent: HTMLElement | null = null;
  private currentOfficer: Officer | null = null;
  private readonly options: DetailsPanelOptions;

  constructor(options: DetailsPanelOptions = {}) {
    this.options = options;
  }

  mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.className = 'details-panel';

    this.container.innerHTML = `
      <div class="details-panel-controls">
        <label class="details-toggle">
          <input type="checkbox" class="details-checkbox" />
          <span class="details-icon">🔬</span>
          <span class="details-label">DETAILS</span>
        </label>
      </div>
      <div class="details-content" style="display: none;">
        <p class="details-empty">Klicke auf einen Offizier, um Details anzuzeigen.</p>
      </div>
    `;

    this.checkbox = this.container.querySelector(
      '.details-checkbox'
    ) as HTMLInputElement;
    this.detailsContent = this.container.querySelector(
      '.details-content'
    ) as HTMLElement;

    this.checkbox.addEventListener('change', () => {
      this.toggleDetailsVisibility();
    });

    parent.appendChild(this.container);
  }

  private toggleDetailsVisibility(): void {
    if (!this.detailsContent || !this.checkbox) return;

    if (this.checkbox.checked) {
      this.detailsContent.style.display = 'block';
      if (this.currentOfficer) {
        this.renderOfficerDetails(this.currentOfficer);
      }
    } else {
      this.detailsContent.style.display = 'none';
    }
  }

  showOfficerDetails(officer: Officer): void {
    this.currentOfficer = officer;

    // Only render if details are currently visible
    if (this.checkbox?.checked) {
      this.renderOfficerDetails(officer);
    }
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
    const latest = officer.memories.slice(-3).reverse();
    return `<ul class="details-memories">${latest
      .map(
        (memory) =>
          `<li><span class="memory-cycle">${memory.cycle}</span><p class="memory-text">${memory.summary}${
            memory.details ? ` <small>${memory.details}</small>` : ''
          }</p></li>`
      )
      .join('')}</ul>`;
  }

  private renderOfficerDetails(officer: Officer): void {
    if (!this.detailsContent) return;

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
            .map((trait) => `<span class="details-badge">${trait}</span>`)
            .join('')
        : '<span class="details-badge details-badge--muted">Kein Merkmal</span>';

    this.detailsContent.innerHTML = `
      <div class="details-header">
        <h3>${officer.name}</h3>
        <span class="details-subtitle">Lv ${officer.level} • ${title} • ${archetype}</span>
        <div class="details-traits">${traits}</div>
      </div>
      <div class="details-stats">
        <h4>Persönlichkeit</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Gier</span>
            <span class="stat-value">${formatStat(officer.personality.gier)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Tapferkeit</span>
            <span class="stat-value">${formatStat(officer.personality.tapferkeit)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Loyalität</span>
            <span class="stat-value">${formatStat(officer.personality.loyalitaet)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Stolz</span>
            <span class="stat-value">${formatStat(officer.personality.stolz)}</span>
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
  }

  isDetailsVisible(): boolean {
    return this.checkbox?.checked ?? false;
  }

  destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.checkbox = null;
    this.detailsContent = null;
    this.currentOfficer = null;
  }
}
