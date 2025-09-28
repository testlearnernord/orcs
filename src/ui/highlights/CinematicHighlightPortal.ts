import type { EnhancedHighlight, HighlightDisplayOptions } from './types';

interface CinematicHighlightPortalOptions {
  onAdvance: () => void;
  onSkip: () => void;
  onSkipAll: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onViewLog: () => void;
}

/**
 * New cinematic highlight portal with enhanced presentation
 * Features:
 * - Officer confrontations with side-by-side portraits
 * - Animation-based presentations
 * - Enhanced display options
 * - Modular and extensible design
 */
export class CinematicHighlightPortal {
  private readonly root: HTMLDivElement;
  private readonly backdrop: HTMLDivElement;
  private readonly card: HTMLElement;
  private readonly iconContainer: HTMLDivElement;
  private readonly officersContainer: HTMLDivElement;
  private readonly contentContainer: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly description: HTMLParagraphElement;
  private readonly cycle: HTMLSpanElement;
  private readonly controlsContainer: HTMLDivElement;
  private readonly enabledCheckbox: HTMLInputElement;
  private readonly advanceBtn: HTMLButtonElement;
  private readonly skipBtn: HTMLButtonElement;
  private readonly skipAllBtn: HTMLButtonElement;
  private readonly logBtn: HTMLButtonElement;

  private current: EnhancedHighlight | null = null;
  private hideTimer: number | null = null;
  private animationTimeout: number | null = null;

  constructor(private readonly options: CinematicHighlightPortalOptions) {
    this.root = this.createRootElement();
    this.backdrop = this.createBackdrop();
    this.card = this.createCard();
    this.iconContainer = this.createIconContainer();
    this.officersContainer = this.createOfficersContainer();
    this.contentContainer = this.createContentContainer();
    this.title = this.createTitle();
    this.description = this.createDescription();
    this.cycle = this.createCycle();
    this.controlsContainer = this.createControlsContainer();
    this.enabledCheckbox = this.createEnabledCheckbox();
    this.advanceBtn = this.createAdvanceButton();
    this.skipBtn = this.createSkipButton();
    this.skipAllBtn = this.createSkipAllButton();
    this.logBtn = this.createLogButton();

    this.assembleElements();
    this.bindEvents();
  }

  private createRootElement(): HTMLDivElement {
    const root = document.createElement('div');
    root.className = 'cinematic-highlight-portal hidden';
    return root;
  }

  private createBackdrop(): HTMLDivElement {
    const backdrop = document.createElement('div');
    backdrop.className = 'cinematic-highlight-portal__backdrop';
    return backdrop;
  }

  private createCard(): HTMLElement {
    const card = document.createElement('article');
    card.className = 'cinematic-highlight-portal__card';
    return card;
  }

  private createIconContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'cinematic-highlight-portal__icon';
    return container;
  }

  private createOfficersContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'cinematic-highlight-portal__officers';
    return container;
  }

  private createContentContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'cinematic-highlight-portal__content';
    return container;
  }

  private createTitle(): HTMLHeadingElement {
    const title = document.createElement('h2');
    title.className = 'cinematic-highlight-portal__title';
    return title;
  }

  private createDescription(): HTMLParagraphElement {
    const desc = document.createElement('p');
    desc.className = 'cinematic-highlight-portal__description';
    return desc;
  }

  private createCycle(): HTMLSpanElement {
    const cycle = document.createElement('span');
    cycle.className = 'cinematic-highlight-portal__cycle';
    return cycle;
  }

  private createControlsContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'cinematic-highlight-portal__controls';
    return container;
  }

  private createEnabledCheckbox(): HTMLInputElement {
    const container = document.createElement('label');
    container.className = 'cinematic-highlight-portal__checkbox';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.addEventListener('change', () => {
      this.options.onToggleEnabled(checkbox.checked);
    });

    const label = document.createElement('span');
    label.textContent = 'Highlights anzeigen';

    container.appendChild(checkbox);
    container.appendChild(label);
    this.controlsContainer.appendChild(container);

    return checkbox;
  }

  private createAdvanceButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cinematic-highlight-portal__button cinematic-highlight-portal__button--primary';
    btn.textContent = 'Weiter';
    btn.addEventListener('click', () => this.options.onAdvance());
    return btn;
  }

  private createSkipButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cinematic-highlight-portal__button';
    btn.textContent = 'Überspringen';
    btn.addEventListener('click', () => this.options.onSkip());
    return btn;
  }

  private createSkipAllButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cinematic-highlight-portal__button cinematic-highlight-portal__button--skip-all';
    btn.textContent = 'Alle überspringen';
    btn.addEventListener('click', () => this.options.onSkipAll());
    return btn;
  }

  private createLogButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cinematic-highlight-portal__button';
    btn.textContent = 'Im Log ansehen';
    btn.addEventListener('click', () => this.options.onViewLog());
    return btn;
  }

  private assembleElements(): void {
    const header = document.createElement('header');
    header.className = 'cinematic-highlight-portal__header';
    header.appendChild(this.cycle);

    this.contentContainer.appendChild(header);
    this.contentContainer.appendChild(this.title);
    this.contentContainer.appendChild(this.description);

    const actions = document.createElement('div');
    actions.className = 'cinematic-highlight-portal__actions';
    actions.append(this.advanceBtn, this.skipBtn, this.skipAllBtn, this.logBtn);

    this.controlsContainer.appendChild(actions);

    this.card.appendChild(this.iconContainer);
    this.card.appendChild(this.officersContainer);
    this.card.appendChild(this.contentContainer);
    this.card.appendChild(this.controlsContainer);

    this.root.appendChild(this.backdrop);
    this.root.appendChild(this.card);
  }

  private bindEvents(): void {
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  attach(parent: HTMLElement = document.body): void {
    parent.appendChild(this.root);
  }

  update(highlight: EnhancedHighlight | null, options: HighlightDisplayOptions): void {
    if (highlight === this.current) return;

    this.enabledCheckbox.checked = options.enabled;

    if (!highlight || !options.enabled) {
      this.current = null;
      this.hide();
      return;
    }

    this.current = highlight;
    this.renderHighlight(highlight);
    this.show();
  }

  private renderHighlight(highlight: EnhancedHighlight): void {
    // Clear previous content
    this.iconContainer.innerHTML = '';
    this.officersContainer.innerHTML = '';

    // Set basic info
    this.title.textContent = highlight.title;
    this.description.textContent = highlight.description || '';
    this.cycle.textContent = `Zyklus ${highlight.cycle}`;

    // Create main icon
    const mainIcon = document.createElement('div');
    mainIcon.className = 'cinematic-highlight-portal__main-icon';
    mainIcon.textContent = highlight.icon;
    this.iconContainer.appendChild(mainIcon);

    // Render officer confrontation if applicable
    if (highlight.primaryOfficer || highlight.secondaryOfficer) {
      this.renderOfficerConfrontation(highlight);
    }

    // Apply animation class based on type
    this.card.className = `cinematic-highlight-portal__card cinematic-highlight-portal__card--${highlight.animationType || 'default'}`;

    // Set animation duration
    if (highlight.duration) {
      this.card.style.setProperty('--animation-duration', `${highlight.duration}ms`);
    }
  }

  private renderOfficerConfrontation(highlight: EnhancedHighlight): void {
    if (highlight.primaryOfficer) {
      const primaryCard = this.createOfficerCard(highlight.primaryOfficer, 'primary');
      this.officersContainer.appendChild(primaryCard);
    }

    if (highlight.secondaryOfficer) {
      const secondaryCard = this.createOfficerCard(highlight.secondaryOfficer, 'secondary');
      this.officersContainer.appendChild(secondaryCard);
    }

    // Add relationship indicator if present
    if (highlight.relationshipChange) {
      const indicator = document.createElement('div');
      indicator.className = 'cinematic-highlight-portal__relationship-indicator';
      indicator.innerHTML = this.getRelationshipIcon(highlight.relationshipChange.before, highlight.relationshipChange.after);
      this.officersContainer.appendChild(indicator);
    }
  }

  private createOfficerCard(officer: any, role: 'primary' | 'secondary'): HTMLElement {
    const card = document.createElement('div');
    card.className = `cinematic-highlight-portal__officer-card cinematic-highlight-portal__officer-card--${role}`;

    const portrait = document.createElement('div');
    portrait.className = 'cinematic-highlight-portal__officer-portrait';
    // Note: Portrait rendering would integrate with existing portrait system
    portrait.textContent = officer.name.charAt(0).toUpperCase();

    const info = document.createElement('div');
    info.className = 'cinematic-highlight-portal__officer-info';
    
    const name = document.createElement('h4');
    name.textContent = officer.name;
    
    const rank = document.createElement('span');
    rank.textContent = officer.rank;

    info.appendChild(name);
    info.appendChild(rank);
    card.appendChild(portrait);
    card.appendChild(info);

    return card;
  }

  private getRelationshipIcon(before: string, after: string): string {
    if (before === 'neutral' && after === 'rival') return '→ ⚔️';
    if (before === 'rival' && after === 'neutral') return '⚔️ → 🤝';
    if (before === 'neutral' && after === 'ally') return '→ 🤝';
    if (before === 'ally' && after === 'neutral') return '🤝 → ⚪';
    return '↔️';
  }

  private show(): void {
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.root.classList.remove('hidden');
    this.root.classList.add('is-visible');
    this.root.classList.remove('is-leaving');
    window.addEventListener('keydown', this.handleKeydown);

    // Auto-advance after duration if specified
    if (this.current?.duration) {
      this.animationTimeout = window.setTimeout(() => {
        this.options.onAdvance();
      }, this.current.duration);
    }
  }

  private hide(): void {
    if (this.root.classList.contains('hidden')) return;

    if (this.animationTimeout) {
      window.clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }

    this.root.classList.add('is-leaving');
    window.removeEventListener('keydown', this.handleKeydown);

    this.hideTimer = window.setTimeout(() => {
      this.root.classList.add('hidden');
      this.root.classList.remove('is-visible');
      this.root.classList.remove('is-leaving');
      this.hideTimer = null;
    }, 300);
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (!this.current) return;
    
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      event.preventDefault();
      this.options.onSkipAll();
      return;
    }
    if (key === 'enter' || key === ' ' || key === 'spacebar') {
      event.preventDefault();
      this.options.onAdvance();
    }
  }
}
