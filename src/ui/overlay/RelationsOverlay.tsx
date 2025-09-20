import type { Officer } from '@sim/types';
import { bezierD, edgeAnchors } from '@ui/overlay/anchors';

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
  strength: number;
  sinceCycle?: number;
  expiresAtCycle?: number;
  lastMemory?: { summary: string; cycle: number };
}

interface RelationsOverlayOptions {
  host: HTMLElement;
  getOfficerElement: (id: string) => HTMLElement | undefined;
  getOfficerData: (id: string) => Officer | undefined;
}

interface TooltipContext {
  edge: RelationEdge;
  anchor: DOMRect;
  from?: Officer;
  to?: Officer;
  currentCycle: number;
}

const TYPE_LABEL: Record<OverlayRelationType, string> = {
  ally: 'Allianz',
  friend: 'Freundschaft',
  rival: 'Rivalität',
  bloodoath: 'Blutschwur',
  hierarchy: 'Befehlskette'
};

const EDGE_COLORS: Record<OverlayRelationType, string> = {
  ally: 'var(--line-ally)',
  friend: 'var(--line-friend)',
  rival: 'var(--line-rival)',
  bloodoath: 'var(--line-blood)',
  hierarchy: 'var(--line-hierarchy)'
};

const DASH_PATTERN: Partial<Record<OverlayRelationType, string>> = {
  bloodoath: '6 4'
};

const TYPE_PRIORITY: Record<OverlayRelationType, number> = {
  bloodoath: 5,
  rival: 4,
  ally: 3,
  friend: 2,
  hierarchy: 1
};

const DEFAULT_DENSITY = 6;
const MIN_DENSITY = 2;
const MAX_DENSITY = 12;

const supportsIntersectionObserver =
  typeof window !== 'undefined' && 'IntersectionObserver' in window;

function mapRelationType(
  type: Officer['relationships'][number]['type']
): OverlayRelationType {
  switch (type) {
    case 'ALLY':
      return 'ally';
    case 'FRIEND':
      return 'friend';
    case 'RIVAL':
      return 'rival';
    case 'BLOOD_OATH':
    default:
      return 'bloodoath';
  }
}

function otherNode(edge: RelationEdge, id: string): string {
  return edge.fromId === id ? edge.toId : edge.fromId;
}

function latestRelationshipMemory(
  officer?: Officer
): { summary: string; cycle: number } | undefined {
  if (!officer) return undefined;
  for (let i = officer.memories.length - 1; i >= 0; i -= 1) {
    const memory = officer.memories[i];
    if (memory.category === 'RELATIONSHIP') {
      return { summary: memory.summary, cycle: memory.cycle };
    }
  }
  return undefined;
}

function resolveLastMemory(
  a?: Officer,
  b?: Officer
): { summary: string; cycle: number } | undefined {
  const entries: { summary: string; cycle: number }[] = [];
  const memoryA = latestRelationshipMemory(a);
  if (memoryA) entries.push(memoryA);
  const memoryB = latestRelationshipMemory(b);
  if (memoryB) entries.push(memoryB);
  if (entries.length === 0) return undefined;
  entries.sort((left, right) => right.cycle - left.cycle);
  return entries[0];
}

function sortEdges(edges: RelationEdge[]): RelationEdge[] {
  return [...edges].sort((a, b) => {
    const priorityDiff = TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type];
    if (priorityDiff !== 0) return priorityDiff;
    const strengthDiff = (b.strength ?? 0) - (a.strength ?? 0);
    if (strengthDiff !== 0) return strengthDiff;
    const sinceA = a.sinceCycle ?? 0;
    const sinceB = b.sinceCycle ?? 0;
    return sinceB - sinceA;
  });
}

export interface LensConfig {
  activeTypes: Set<OverlayRelationType>;
  density: number;
  includeSecondOrder: boolean;
}

export function selectEdgesForFocus(
  adjacency: Map<string, RelationEdge[]>,
  focusId: string,
  config: LensConfig
): RelationEdge[] {
  const focusEdges = adjacency.get(focusId);
  if (!focusEdges) return [];
  const allowed = config.activeTypes;
  const selected = new Map<string, RelationEdge>();
  const neighbors = new Set<string>();

  let count = 0;
  for (const edge of focusEdges) {
    if (!allowed.has(edge.type)) continue;
    selected.set(edge.id, edge);
    neighbors.add(otherNode(edge, focusId));
    count += 1;
    if (count >= config.density) break;
  }

  if (!config.includeSecondOrder) {
    return Array.from(selected.values());
  }

  neighbors.forEach((neighborId) => {
    const neighborEdges = adjacency.get(neighborId);
    if (!neighborEdges) return;
    let neighborCount = 0;
    for (const edge of neighborEdges) {
      if (!allowed.has(edge.type)) continue;
      if (selected.has(edge.id)) continue;
      selected.set(edge.id, edge);
      neighborCount += 1;
      if (neighborCount >= config.density) break;
    }
  });

  return Array.from(selected.values());
}

export function buildRelationEdges(
  officers: Officer[],
  currentCycle: number
): RelationEdge[] {
  const edges: RelationEdge[] = [];
  const officerById = new Map(officers.map((officer) => [officer.id, officer]));
  const seen = new Set<string>();

  officers.forEach((officer) => {
    officer.relationships.forEach((relation) => {
      const peer = officerById.get(relation.with);
      const key = [officer.id, relation.with, relation.type].sort().join(':');
      if (seen.has(key)) return;
      seen.add(key);
      const type = mapRelationType(relation.type);
      const lastMemory = resolveLastMemory(officer, peer);
      const strength =
        relation.type === 'BLOOD_OATH'
          ? 1
          : relation.type === 'RIVAL'
            ? 0.75
            : relation.type === 'ALLY'
              ? 0.65
              : 0.5;
      edges.push({
        id: key,
        fromId: officer.id,
        toId: relation.with,
        type,
        strength,
        sinceCycle: relation.sinceCycle,
        expiresAtCycle: relation.expiresAtCycle,
        lastMemory
      });
    });
  });

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
    if (index === 0) return;
    const candidates = byRank.get(rank) ?? [];
    const superiors = rankOrder.slice(0, index);
    candidates.forEach((officer) => {
      for (const superiorRank of superiors) {
        const superiorList = byRank.get(superiorRank) ?? [];
        if (superiorList.length === 0) continue;
        const superior = superiorList[0];
        edges.push({
          id: `hierarchy:${officer.id}->${superior.id}`,
          fromId: officer.id,
          toId: superior.id,
          type: 'hierarchy',
          strength: 0.3,
          sinceCycle: currentCycle
        });
        break;
      }
    });
  });

  return edges;
}

class EdgeTooltip {
  private readonly el: HTMLDivElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'relations-tooltip hidden';
    document.body.appendChild(this.el);
  }

  show(context: TooltipContext): void {
    const { edge, anchor, from, to, currentCycle } = context;
    this.el.innerHTML = '';
    const header = document.createElement('header');
    const label = document.createElement('span');
    label.className = 'relations-tooltip__label';
    label.dataset.type = edge.type;
    label.textContent = TYPE_LABEL[edge.type];
    const names = document.createElement('span');
    names.className = 'relations-tooltip__names';
    names.textContent = `${from?.name ?? edge.fromId} ↔ ${to?.name ?? edge.toId}`;
    header.append(label, names);

    const list = document.createElement('ul');
    const strength = document.createElement('li');
    strength.textContent = `Stärke ${(edge.strength ?? 0).toFixed(2)}`;
    list.appendChild(strength);

    if (edge.sinceCycle !== undefined) {
      const duration = document.createElement('li');
      const cycles = Math.max(0, currentCycle - edge.sinceCycle);
      duration.textContent = `Dauer ${cycles} Zyklen`;
      list.appendChild(duration);
    }

    if (edge.expiresAtCycle !== undefined) {
      const expires = document.createElement('li');
      expires.textContent = `Gültig bis Zyklus ${edge.expiresAtCycle}`;
      list.appendChild(expires);
    }

    if (edge.lastMemory) {
      const memo = document.createElement('li');
      memo.textContent = `Letzte Erinnerung (Zyklus ${edge.lastMemory.cycle}): ${edge.lastMemory.summary}`;
      list.appendChild(memo);
    }

    this.el.append(header, list);
    const x = anchor.left + anchor.width / 2 + window.scrollX;
    const y = anchor.top + anchor.height + 12 + window.scrollY;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.classList.remove('hidden');
  }

  hide(): void {
    this.el.classList.add('hidden');
  }
}

export class RelationsOverlay {
  private readonly options: RelationsOverlayOptions;
  private readonly container: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly toolbar: HTMLDivElement;
  private readonly toggleButtons = new Map<
    OverlayRelationType,
    HTMLButtonElement
  >();
  private slider!: HTMLInputElement;
  private sliderValue!: HTMLSpanElement;
  private checkbox!: HTMLInputElement;
  private readonly tooltip = new EdgeTooltip();
  private readonly adjacency = new Map<string, RelationEdge[]>();
  private readonly observedCards = new Map<string, HTMLElement>();
  private readonly visibleCards = new Set<string>();
  private readonly activeTypes = new Set<OverlayRelationType>([
    'ally',
    'friend',
    'rival',
    'bloodoath',
    'hierarchy'
  ]);
  private lensMask = new Set<OverlayRelationType>([
    'ally',
    'friend',
    'rival',
    'bloodoath',
    'hierarchy'
  ]);
  private focusId: string | null = null;
  private hoverId: string | null = null;
  private pinnedId: string | null = null;
  private density = DEFAULT_DENSITY;
  private includeSecondOrder = false;
  private currentCycle = 0;
  private pendingFrame: number | null = null;
  private readonly resizeObserver: ResizeObserver;
  private readonly mutationObserver: MutationObserver;
  private readonly cardObserver: IntersectionObserver | null;
  private enabled = true;
  private legendVisible = true;

  constructor(options: RelationsOverlayOptions) {
    this.options = options;
    this.container = document.createElement('div');
    this.container.className = 'relations-overlay';
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('fill', 'none');
    this.container.appendChild(this.svg);

    this.toolbar = this.buildToolbar();
    this.container.appendChild(this.toolbar);

    options.host.appendChild(this.container);

    this.resizeObserver = new ResizeObserver(() => this.requestRender());
    this.resizeObserver.observe(options.host);

    this.mutationObserver = new MutationObserver(() => {
      this.syncObservedCards();
      this.requestRender();
    });
    this.mutationObserver.observe(options.host, {
      childList: true,
      subtree: true,
      attributes: true
    });

    options.host.addEventListener('pointerover', (event) =>
      this.handlePointerOver(event as PointerEvent)
    );
    options.host.addEventListener('pointerleave', (event) =>
      this.handlePointerLeave(event as PointerEvent)
    );
    options.host.addEventListener('focusin', (event) =>
      this.handleFocusIn(event as FocusEvent)
    );
    options.host.addEventListener('focusout', (event) =>
      this.handleFocusOut(event as FocusEvent)
    );
    options.host.addEventListener('scroll', () => this.requestRender(), {
      passive: true
    });

    window.addEventListener('resize', () => this.requestRender());
    window.addEventListener('scroll', () => this.requestRender(), {
      passive: true
    });
    window.addEventListener('keydown', (event) => this.handleKeydown(event));

    if (supportsIntersectionObserver) {
      this.cardObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const el = entry.target as HTMLElement;
            const id = el.dataset.officerId;
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

    this.syncToolbarState();
  }

  setEdges(edges: RelationEdge[], cycle: number): void {
    this.currentCycle = cycle;
    this.adjacency.clear();
    edges.forEach((edge) => {
      const left = this.adjacency.get(edge.fromId) ?? [];
      left.push(edge);
      this.adjacency.set(edge.fromId, left);
      const right = this.adjacency.get(edge.toId) ?? [];
      right.push(edge);
      this.adjacency.set(edge.toId, right);
    });
    this.adjacency.forEach((list, id) => {
      this.adjacency.set(id, sortEdges(list));
    });
    if (this.focusId && !this.adjacency.has(this.focusId)) {
      this.focusId = null;
      this.pinnedId = null;
    }
    this.syncObservedCards();
    this.requestRender();
  }

  setVisible(value: boolean): void {
    this.container.classList.toggle('is-hidden', !value);
    if (!value) {
      this.tooltip.hide();
    }
  }

  setLensMask(types: Set<OverlayRelationType>): void {
    const next = new Set(types);
    if (next.size === this.lensMask.size) {
      let diff = false;
      this.lensMask.forEach((type) => {
        if (!next.has(type)) {
          diff = true;
        }
      });
      if (!diff) {
        return;
      }
    }
    this.lensMask = next;
    this.requestRender();
  }

  setLensEnabled(value: boolean): void {
    if (this.enabled === value) return;
    this.enabled = value;
    this.container.classList.toggle('is-disabled', !value);
    if (!value) {
      this.tooltip.hide();
      this.svg.replaceChildren();
      return;
    }
    this.requestRender();
  }

  isLensEnabled(): boolean {
    return this.enabled;
  }

  setLegendVisible(value: boolean): void {
    if (this.legendVisible === value) return;
    this.legendVisible = value;
    this.toolbar.classList.toggle('is-hidden', !value);
  }

  isLegendVisible(): boolean {
    return this.legendVisible;
  }

  refresh(): void {
    this.requestRender();
  }

  private buildToolbar(): HTMLDivElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'relations-overlay__toolbar';

    const title = document.createElement('span');
    title.className = 'relations-overlay__title';
    title.textContent = 'Beziehungs-Lens';
    toolbar.appendChild(title);

    const toggles = document.createElement('div');
    toggles.className = 'relations-overlay__toggles';
    (
      [
        'ally',
        'friend',
        'rival',
        'bloodoath',
        'hierarchy'
      ] as OverlayRelationType[]
    ).forEach((type) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = TYPE_LABEL[type];
      button.className = 'relations-overlay__toggle is-active';
      button.setAttribute('aria-pressed', 'true');
      button.addEventListener('click', () => this.toggleType(type));
      toggles.appendChild(button);
      this.toggleButtons.set(type, button);
    });
    toolbar.appendChild(toggles);

    const sliderWrapper = document.createElement('label');
    sliderWrapper.className = 'relations-overlay__slider';
    const sliderTitle = document.createElement('span');
    sliderTitle.textContent = 'Kantenlimit';
    this.sliderValue = document.createElement('span');
    this.sliderValue.className = 'relations-overlay__slider-value';
    this.sliderValue.textContent = `${this.density}`;
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = MIN_DENSITY.toString();
    this.slider.max = MAX_DENSITY.toString();
    this.slider.value = DEFAULT_DENSITY.toString();
    this.slider.addEventListener('input', () =>
      this.setDensity(Number(this.slider.value))
    );
    sliderWrapper.append(sliderTitle, this.slider, this.sliderValue);
    toolbar.appendChild(sliderWrapper);

    const checkboxWrapper = document.createElement('label');
    checkboxWrapper.className = 'relations-overlay__checkbox';
    this.checkbox = document.createElement('input');
    this.checkbox.type = 'checkbox';
    this.checkbox.addEventListener('change', () =>
      this.setSecondOrder(this.checkbox.checked)
    );
    const checkboxLabel = document.createElement('span');
    checkboxLabel.textContent = '+1 Tiefe';
    checkboxWrapper.append(this.checkbox, checkboxLabel);
    toolbar.appendChild(checkboxWrapper);

    return toolbar;
  }

  private setDensity(value: number): void {
    const next = Math.min(
      MAX_DENSITY,
      Math.max(MIN_DENSITY, Math.round(value))
    );
    if (this.density === next) return;
    this.density = next;
    this.slider.value = `${next}`;
    this.sliderValue.textContent = `${next}`;
    this.requestRender();
  }

  private toggleType(type: OverlayRelationType): void {
    if (this.activeTypes.has(type) && this.activeTypes.size === 1) {
      return;
    }
    if (this.activeTypes.has(type)) {
      this.activeTypes.delete(type);
    } else {
      this.activeTypes.add(type);
    }
    this.syncToolbarState();
    this.requestRender();
  }

  private setSecondOrder(value: boolean): void {
    if (this.includeSecondOrder === value) return;
    this.includeSecondOrder = value;
    this.checkbox.checked = value;
    this.requestRender();
  }

  private syncToolbarState(): void {
    this.toggleButtons.forEach((button, type) => {
      const active = this.activeTypes.has(type);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    this.sliderValue.textContent = `${this.density}`;
    this.checkbox.checked = this.includeSecondOrder;
  }

  private handlePointerOver(event: PointerEvent): void {
    if (!this.enabled) return;
    const target = event.target as HTMLElement | null;
    const card = target?.closest<HTMLElement>('.officer-card');
    if (!card) return;
    const id = card.dataset.officerId;
    if (!id) return;
    this.hoverId = id;
    if (event.shiftKey) {
      this.pinnedId = id;
    }
    if (this.pinnedId && this.pinnedId !== id) {
      if (event.shiftKey) {
        this.pinnedId = id;
        this.applyFocus(id);
      }
      return;
    }
    this.applyFocus(id);
  }

  private handlePointerLeave(event: PointerEvent): void {
    const related = event.relatedTarget as HTMLElement | null;
    if (related && this.options.host.contains(related)) return;
    this.hoverId = null;
    if (!this.pinnedId) {
      this.applyFocus(null);
    }
  }

  private handleFocusIn(event: FocusEvent): void {
    if (!this.enabled) return;
    const target = event.target as HTMLElement | null;
    const card = target?.closest<HTMLElement>('.officer-card');
    if (!card) return;
    const id = card.dataset.officerId;
    if (!id) return;
    this.applyFocus(id);
  }

  private handleFocusOut(event: FocusEvent): void {
    const related = event.relatedTarget as HTMLElement | null;
    if (related && this.options.host.contains(related)) return;
    if (!this.pinnedId) {
      this.applyFocus(null);
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.pinnedId = null;
      this.applyFocus(this.hoverId);
      this.tooltip.hide();
    }
  }

  private applyFocus(id: string | null): void {
    if (this.focusId === id) return;
    this.focusId = id;
    this.requestRender();
  }

  private computeEdgesForFocus(): RelationEdge[] {
    if (!this.focusId) return [];
    const allowed = new Set<OverlayRelationType>();
    this.activeTypes.forEach((type) => {
      if (this.lensMask.has(type)) {
        allowed.add(type);
      }
    });
    if (allowed.size === 0) {
      return [];
    }
    return selectEdgesForFocus(this.adjacency, this.focusId, {
      activeTypes: allowed,
      density: this.density,
      includeSecondOrder: this.includeSecondOrder
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
    if (!this.focusId || !this.enabled) {
      this.svg.replaceChildren();
      this.tooltip.hide();
      return;
    }
    const host = this.options.host;
    const width = Math.max(host.scrollWidth, host.clientWidth);
    const height = Math.max(host.scrollHeight, host.clientHeight);
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.svg.setAttribute('width', `${width}`);
    this.svg.setAttribute('height', `${height}`);

    const edges = this.computeEdgesForFocus();
    const fragment = document.createDocumentFragment();

    edges.forEach((edge) => {
      const fromEl = this.options.getOfficerElement(edge.fromId);
      const toEl = this.options.getOfficerElement(edge.toId);
      if (!fromEl || !toEl) return;
      if (supportsIntersectionObserver) {
        if (
          !this.visibleCards.has(edge.fromId) ||
          !this.visibleCards.has(edge.toId)
        ) {
          return;
        }
      }
      const { A, B } = edgeAnchors(this.svg, fromEl, toEl);
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      );
      path.classList.add('relations-overlay__edge');
      path.setAttribute('d', bezierD(A, B));
      path.setAttribute('stroke', EDGE_COLORS[edge.type]);
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('pointer-events', 'visibleStroke');
      path.dataset.type = edge.type;
      const dash = DASH_PATTERN[edge.type];
      if (dash) {
        path.setAttribute('stroke-dasharray', dash);
      }
      path.dataset.edgeId = edge.id;
      path.addEventListener('mouseenter', () => {
        path.classList.add('is-hovered');
        const targetRect = path.getBoundingClientRect();
        const from = this.options.getOfficerData(edge.fromId);
        const to = this.options.getOfficerData(edge.toId);
        this.tooltip.show({
          edge,
          anchor: targetRect,
          from,
          to,
          currentCycle: this.currentCycle
        });
      });
      path.addEventListener('mouseleave', () => {
        path.classList.remove('is-hovered');
        this.tooltip.hide();
      });
      fragment.appendChild(path);
    });

    this.svg.replaceChildren(fragment);
    if (edges.length === 0) {
      this.tooltip.hide();
    }
  }

  private syncObservedCards(): void {
    const observer = this.cardObserver;
    if (!observer) {
      this.visibleCards.clear();
      this.adjacency.forEach((_edges, id) => this.visibleCards.add(id));
      return;
    }

    const needed = new Set<string>(this.adjacency.keys());
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
}
