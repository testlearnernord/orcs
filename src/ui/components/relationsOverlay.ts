import type { Officer } from '@sim/types';

export type OverlayRelationType =
  | 'ally'
  | 'friend'
  | 'rival'
  | 'bloodoath'
  | 'hierarchy';

export interface RelationEdge {
  id: string;
  fromId: string;
  toId: string;
  type: OverlayRelationType;
  strength?: number;
  sinceCycle?: number;
  expiresAtCycle?: number;
}

interface RenderEdge extends RelationEdge {
  fromEl: HTMLElement;
  toEl: HTMLElement;
}

const COLORS: Record<OverlayRelationType, string> = {
  ally: '#60a5fa',
  friend: '#38bdf8',
  rival: '#f87171',
  bloodoath: '#c084fc',
  hierarchy: '#94a3b8'
};

const STROKE: Record<OverlayRelationType, string> = {
  ally: '2',
  friend: '2',
  rival: '2.5',
  bloodoath: '3',
  hierarchy: '1.5'
};

const DASH: Partial<Record<OverlayRelationType, string>> = {
  bloodoath: '6 3'
};

class RelationTooltip {
  private readonly el: HTMLDivElement;
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'relation-tooltip';
    this.el.setAttribute('role', 'status');
    this.hide();
    document.body.appendChild(this.el);
  }

  show(edge: RelationEdge, anchor: DOMRect): void {
    this.el.innerHTML = `
      <strong>${labelFor(edge.type)}</strong>
      <span>Stärke: ${(edge.strength ?? 0.5).toFixed(2)}</span>
      ${edge.sinceCycle !== undefined ? `<span>Seit Zyklus ${edge.sinceCycle}</span>` : ''}
      ${edge.expiresAtCycle !== undefined ? `<span>Gültig bis Zyklus ${edge.expiresAtCycle}</span>` : ''}
    `;
    this.el.style.left = `${anchor.left + anchor.width / 2}px`;
    this.el.style.top = `${anchor.top + window.scrollY - 32}px`;
    this.el.classList.add('is-visible');
  }

  hide(): void {
    this.el.classList.remove('is-visible');
  }
}

function labelFor(type: OverlayRelationType): string {
  switch (type) {
    case 'ally':
      return 'Allianz';
    case 'friend':
      return 'Freundschaft';
    case 'rival':
      return 'Rivalität';
    case 'bloodoath':
      return 'Blutschwur';
    case 'hierarchy':
      return 'Befehlskette';
    default:
      return type;
  }
}

export interface RelationsOverlayOptions {
  getOfficerElement: (id: string) => HTMLElement | undefined;
  host: HTMLElement;
}

export class RelationsOverlay {
  private readonly svg: SVGSVGElement;
  private readonly options: RelationsOverlayOptions;
  private edges: RelationEdge[] = [];
  private readonly tooltip = new RelationTooltip();
  private readonly legend: HTMLDivElement;
  private visible = true;
  private pendingFrame: number | null = null;

  constructor(options: RelationsOverlayOptions) {
    this.options = options;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('relations-overlay');
    options.host.appendChild(this.svg);

    this.legend = document.createElement('div');
    this.legend.className = 'relations-legend';
    this.legend.innerHTML = `
      <button type="button" class="relations-legend__toggle">Beziehungs-Legende</button>
      <div class="relations-legend__body">
        <span data-type="ally">Ally/Freund</span>
        <span data-type="rival">Rival</span>
        <span data-type="bloodoath">Blutschwur</span>
        <span data-type="hierarchy">Befehlskette</span>
      </div>
    `;
    options.host.appendChild(this.legend);
    const toggle = this.legend.querySelector<HTMLButtonElement>(
      '.relations-legend__toggle'
    );
    toggle?.addEventListener('click', () => {
      this.legend.classList.toggle('is-open');
    });
  }

  setEdges(edges: RelationEdge[]): void {
    this.edges = edges;
    this.requestRender();
  }

  setVisible(value: boolean): void {
    this.visible = value;
    this.svg.style.display = value ? 'block' : 'none';
    if (!value) this.tooltip.hide();
  }

  private requestRender(): void {
    if (this.pendingFrame !== null) return;
    this.pendingFrame = window.requestAnimationFrame(() => {
      this.pendingFrame = null;
      this.render();
    });
  }

  private render(): void {
    const hostRect = this.options.host.getBoundingClientRect();
    this.svg.setAttribute('width', `${hostRect.width}`);
    this.svg.setAttribute('height', `${hostRect.height}`);
    this.svg.setAttribute(
      'viewBox',
      `0 0 ${hostRect.width} ${hostRect.height}`
    );
    this.svg.innerHTML = '';

    const renderEdges: RenderEdge[] = [];
    this.edges.forEach((edge) => {
      const fromEl = this.options.getOfficerElement(edge.fromId);
      const toEl = this.options.getOfficerElement(edge.toId);
      if (!fromEl || !toEl) return;
      renderEdges.push({ ...edge, fromEl, toEl });
    });

    renderEdges.forEach((edge, index) => {
      const fromRect = edge.fromEl.getBoundingClientRect();
      const toRect = edge.toEl.getBoundingClientRect();
      const startX = fromRect.left + fromRect.width / 2 - hostRect.left;
      const startY = fromRect.top + fromRect.height / 2 - hostRect.top;
      const endX = toRect.left + toRect.width / 2 - hostRect.left;
      const endY = toRect.top + toRect.height / 2 - hostRect.top;
      const midX = (startX + endX) / 2;
      const offset = (index % 2 === 0 ? 1 : -1) * 24;
      const controlY = (startY + endY) / 2 - offset;
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      );
      path.setAttribute(
        'd',
        `M ${startX} ${startY} Q ${midX} ${controlY} ${endX} ${endY}`
      );
      path.setAttribute('stroke', COLORS[edge.type]);
      path.setAttribute('stroke-width', STROKE[edge.type]);
      const dash = DASH[edge.type];
      if (dash) path.setAttribute('stroke-dasharray', dash);
      path.setAttribute('fill', 'none');
      path.setAttribute('data-edge-id', edge.id);
      path.classList.add(`edge-${edge.type}`);
      path.addEventListener('mouseenter', () => {
        const box = path.getBoundingClientRect();
        this.tooltip.show(edge, box);
      });
      path.addEventListener('mouseleave', () => this.tooltip.hide());
      this.svg.appendChild(path);
    });
  }
}

export function buildRelationEdges(
  officers: Officer[],
  includeHierarchy: boolean,
  currentCycle: number
): RelationEdge[] {
  const edges: RelationEdge[] = [];
  const seen = new Set<string>();
  officers.forEach((officer) => {
    officer.relationships.forEach((relation) => {
      const key = [officer.id, relation.with].sort().join(':');
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({
        id: key,
        fromId: officer.id,
        toId: relation.with,
        type:
          relation.type === 'ALLY'
            ? 'ally'
            : relation.type === 'FRIEND'
              ? 'friend'
              : relation.type === 'RIVAL'
                ? 'rival'
                : 'bloodoath',
        strength: relation.type === 'BLOOD_OATH' ? 1 : 0.5,
        sinceCycle: relation.sinceCycle,
        expiresAtCycle: relation.expiresAtCycle
      });
    });
  });
  if (includeHierarchy) {
    const byRank = new Map<Officer['rank'], Officer[]>([
      ['König', []],
      ['Spieler', []],
      ['Captain', []],
      ['Späher', []],
      ['Grunzer', []]
    ]);
    officers.forEach((officer) => {
      const list = byRank.get(officer.rank);
      if (list) list.push(officer);
    });
    const rankOrder: Officer['rank'][] = [
      'König',
      'Spieler',
      'Captain',
      'Späher',
      'Grunzer'
    ];
    rankOrder.forEach((rank, index) => {
      const superiors = rankOrder.slice(0, index);
      const targets = byRank.get(rank) ?? [];
      targets.forEach((officer) => {
        if (superiors.length === 0) return;
        const superiorRank = superiors[superiors.length - 1];
        const superior = (byRank.get(superiorRank) ?? [])[0];
        if (!superior) return;
        const key = `hierarchy:${officer.id}->${superior.id}`;
        edges.push({
          id: key,
          fromId: officer.id,
          toId: superior.id,
          type: 'hierarchy',
          strength: 0.3,
          sinceCycle: currentCycle
        });
      });
    });
  }
  return edges;
}
