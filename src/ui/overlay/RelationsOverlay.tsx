import type { Officer } from '@sim/types';
import { centerOf } from '@ui/overlay/domCoords';

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

interface RelationsOverlayOptions {
  host: HTMLElement;
  getOfficerElement: (id: string) => HTMLElement | undefined;
}

const COLORS: Record<OverlayRelationType, string> = {
  ally: '#6aa7ff',
  friend: '#38bdf8',
  rival: '#e66',
  bloodoath: '#a6f',
  hierarchy: '#889'
};

const STROKE_WIDTH: Record<OverlayRelationType, number> = {
  ally: 2,
  friend: 2,
  rival: 2.5,
  bloodoath: 3,
  hierarchy: 1.5
};

const DASH_PATTERN: Partial<Record<OverlayRelationType, string>> = {
  bloodoath: '6 4'
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
      ${
        edge.expiresAtCycle !== undefined
          ? `<span>Gültig bis Zyklus ${edge.expiresAtCycle}</span>`
          : ''
      }
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

const supportsIntersectionObserver =
  typeof window !== 'undefined' && 'IntersectionObserver' in window;

export class RelationsOverlay {
  private readonly svg: SVGSVGElement;
  private readonly options: RelationsOverlayOptions;
  private readonly tooltip = new RelationTooltip();
  private readonly legend: HTMLDivElement;
  private edges: RelationEdge[] = [];
  private visible = true;
  private pendingFrame: number | null = null;
  private readonly cardObserver: IntersectionObserver | null;
  private readonly observedCards = new Map<string, HTMLElement>();
  private readonly visibleCards = new Set<string>();
  private readonly resizeObserver: ResizeObserver;
  private readonly mutationObserver: MutationObserver;
  private readonly handleHostScroll: () => void;
  private readonly handleWindowScroll: () => void;

  constructor(options: RelationsOverlayOptions) {
    this.options = options;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('relations-overlay');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    options.host.appendChild(this.svg);

    this.legend = document.createElement('div');
    this.legend.className = 'relations-legend';
    this.legend.innerHTML = `
      <button type="button" class="relations-legend__toggle">Beziehungs-Legende</button>
      <div class="relations-legend__body">
        <span data-type="ally">Allianz/Freundschaft</span>
        <span data-type="rival">Rivalität</span>
        <span data-type="bloodoath">Blutschwur</span>
        <span data-type="hierarchy">Befehlskette</span>
      </div>
    `;
    options.host.appendChild(this.legend);
    this.legend
      .querySelector<HTMLButtonElement>('.relations-legend__toggle')
      ?.addEventListener('click', () => {
        this.legend.classList.toggle('is-open');
      });

    this.handleHostScroll = () => this.requestRender();
    this.handleWindowScroll = () => this.requestRender();

    this.resizeObserver = new ResizeObserver(() => this.requestRender());
    this.resizeObserver.observe(options.host);

    this.mutationObserver = new MutationObserver(() => {
      this.syncObservedCards();
      this.requestRender();
    });
    this.mutationObserver.observe(options.host, {
      subtree: true,
      childList: true,
      attributes: true
    });

    options.host.addEventListener('scroll', this.handleHostScroll, {
      passive: true
    });
    window.addEventListener('resize', this.handleWindowScroll);
    window.addEventListener('scroll', this.handleWindowScroll, {
      passive: true
    });

    if (supportsIntersectionObserver) {
      this.cardObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const target = entry.target as HTMLElement;
            const id = target.dataset.officerId;
            if (!id) return;
            if (entry.isIntersecting) {
              this.visibleCards.add(id);
            } else {
              this.visibleCards.delete(id);
            }
          });
          this.requestRender();
        },
        { root: options.host, threshold: 0.05 }
      );
    } else {
      this.cardObserver = null;
    }
  }

  setVisible(value: boolean): void {
    this.visible = value;
    this.svg.style.display = value ? 'block' : 'none';
    if (!value) this.tooltip.hide();
  }

  setEdges(edges: RelationEdge[]): void {
    this.edges = edges;
    this.syncObservedCards();
    this.requestRender();
  }

  private syncObservedCards(): void {
    const needed = new Set<string>();
    this.edges.forEach((edge) => {
      needed.add(edge.fromId);
      needed.add(edge.toId);
    });

    const observer = this.cardObserver;
    if (!observer) {
      this.visibleCards.clear();
      needed.forEach((id) => this.visibleCards.add(id));
      return;
    }

    const toRemove: string[] = [];
    this.observedCards.forEach((element, id) => {
      if (!needed.has(id) || !document.body.contains(element)) {
        observer.unobserve(element);
        this.visibleCards.delete(id);
        toRemove.push(id);
      }
    });
    toRemove.forEach((id) => this.observedCards.delete(id));

    needed.forEach((id) => {
      if (this.observedCards.has(id)) return;
      const element = this.options.getOfficerElement(id);
      if (!element) return;
      this.observedCards.set(id, element);
      observer.observe(element);
    });
  }

  private requestRender(): void {
    if (this.pendingFrame !== null) return;
    this.pendingFrame = window.requestAnimationFrame(() => {
      this.pendingFrame = null;
      this.render();
    });
  }

  private render(): void {
    if (!this.visible) return;
    const hostRect = this.options.host.getBoundingClientRect();
    const width = Math.max(1, hostRect.width);
    const height = Math.max(1, hostRect.height);
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.svg.setAttribute('width', `${width}`);
    this.svg.setAttribute('height', `${height}`);
    this.svg.replaceChildren();

    const root = this.options.host;

    this.edges.forEach((edge) => {
      const from = this.options.getOfficerElement(edge.fromId);
      const to = this.options.getOfficerElement(edge.toId);
      if (!from || !to) return;
      if (supportsIntersectionObserver) {
        if (
          !this.visibleCards.has(edge.fromId) ||
          !this.visibleCards.has(edge.toId)
        ) {
          return;
        }
      }

      const start = centerOf(from, root);
      const end = centerOf(to, root);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;

      const control1 = {
        x: start.x + dx * 0.25,
        y: start.y + dy * 0.25
      };
      const control2 = {
        x: start.x + dx * 0.75,
        y: start.y + dy * 0.75
      };

      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      );
      path.setAttribute(
        'd',
        `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`
      );
      const strokeColor = COLORS[edge.type] ?? COLORS.ally;
      path.setAttribute('stroke', strokeColor);
      path.setAttribute('stroke-width', `${STROKE_WIDTH[edge.type] ?? 2}`);
      const dash = DASH_PATTERN[edge.type];
      if (dash) {
        path.setAttribute('stroke-dasharray', dash);
      }
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('pointer-events', 'visibleStroke');
      path.dataset.edgeId = edge.id;
      path.addEventListener('mouseenter', () => {
        const rect = path.getBoundingClientRect();
        this.tooltip.show(edge, rect);
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
      const type: OverlayRelationType =
        relation.type === 'ALLY'
          ? 'ally'
          : relation.type === 'FRIEND'
            ? 'friend'
            : relation.type === 'RIVAL'
              ? 'rival'
              : 'bloodoath';
      edges.push({
        id: key,
        fromId: officer.id,
        toId: relation.with,
        type,
        strength: relation.type === 'BLOOD_OATH' ? 1 : 0.5,
        sinceCycle: relation.sinceCycle,
        expiresAtCycle: relation.expiresAtCycle
      });
    });
  });

  if (includeHierarchy) {
    const rankOrder: Officer['rank'][] = [
      'König',
      'Spieler',
      'Captain',
      'Späher',
      'Grunzer'
    ];
    const byRank = new Map<Officer['rank'], Officer[]>(
      rankOrder.map((rank) => [rank, []])
    );
    officers.forEach((officer) => {
      const list = byRank.get(officer.rank);
      list?.push(officer);
    });

    rankOrder.forEach((rank, index) => {
      const targets = byRank.get(rank) ?? [];
      const superiors = rankOrder.slice(0, index);
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
