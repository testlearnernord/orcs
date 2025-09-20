import type { Highlight } from '@state/cycleDigest';

interface HighlightPortalOptions {
  onAdvance: () => void;
  onSkip: () => void;
  onViewLog: () => void;
}

export class HighlightPortal {
  private readonly root: HTMLDivElement;
  private readonly card: HTMLElement;
  private readonly icon: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly text: HTMLParagraphElement;
  private readonly cycle: HTMLSpanElement;
  private readonly advanceBtn: HTMLButtonElement;
  private readonly skipBtn: HTMLButtonElement;
  private readonly logBtn: HTMLButtonElement;
  private current: Highlight | null = null;
  private hideTimer: number | null = null;

  constructor(private readonly options: HighlightPortalOptions) {
    this.root = document.createElement('div');
    this.root.className = 'highlight-portal hidden';

    const backdrop = document.createElement('div');
    backdrop.className = 'highlight-portal__backdrop';
    this.root.appendChild(backdrop);

    this.card = document.createElement('article');
    this.card.className = 'highlight-portal__card';

    this.icon = document.createElement('div');
    this.icon.className = 'highlight-portal__icon';

    const body = document.createElement('div');
    body.className = 'highlight-portal__body';

    const header = document.createElement('header');
    header.className = 'highlight-portal__header';
    this.cycle = document.createElement('span');
    this.cycle.className = 'highlight-portal__cycle';
    header.appendChild(this.cycle);

    this.title = document.createElement('h3');
    this.title.className = 'highlight-portal__title';
    this.text = document.createElement('p');
    this.text.className = 'highlight-portal__text';

    const actions = document.createElement('div');
    actions.className = 'highlight-portal__actions';
    this.advanceBtn = document.createElement('button');
    this.advanceBtn.type = 'button';
    this.advanceBtn.className =
      'highlight-portal__button highlight-portal__button--primary';
    this.advanceBtn.textContent = 'Weiter';
    this.advanceBtn.addEventListener('click', () => this.options.onAdvance());
    this.skipBtn = document.createElement('button');
    this.skipBtn.type = 'button';
    this.skipBtn.className = 'highlight-portal__button';
    this.skipBtn.textContent = 'Alle überspringen';
    this.skipBtn.addEventListener('click', () => this.options.onSkip());
    this.logBtn = document.createElement('button');
    this.logBtn.type = 'button';
    this.logBtn.className = 'highlight-portal__button';
    this.logBtn.textContent = 'Im Log ansehen';
    this.logBtn.addEventListener('click', () => this.options.onViewLog());

    actions.append(this.advanceBtn, this.skipBtn, this.logBtn);
    body.append(header, this.title, this.text, actions);
    this.card.append(this.icon, body);
    this.root.appendChild(this.card);

    this.handleKeydown = this.handleKeydown.bind(this);
  }

  attach(parent: HTMLElement = document.body): void {
    parent.appendChild(this.root);
  }

  update(highlight: Highlight | null): void {
    if (highlight === this.current) return;
    if (!highlight) {
      this.current = null;
      this.hide();
      return;
    }
    this.current = highlight;
    this.renderHighlight(highlight);
    this.show();
  }

  private renderHighlight(highlight: Highlight): void {
    this.icon.textContent = highlight.icon;
    this.title.textContent = highlight.title;
    this.cycle.textContent = `Zyklus ${highlight.cycle}`;
    if (highlight.text) {
      this.text.textContent = highlight.text;
      this.text.classList.remove('is-hidden');
    } else {
      this.text.textContent = '';
      this.text.classList.add('is-hidden');
    }
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
  }

  private hide(): void {
    if (this.root.classList.contains('hidden')) return;
    this.root.classList.add('is-leaving');
    window.removeEventListener('keydown', this.handleKeydown);
    this.hideTimer = window.setTimeout(() => {
      this.root.classList.add('hidden');
      this.root.classList.remove('is-visible');
      this.root.classList.remove('is-leaving');
      this.hideTimer = null;
    }, 200);
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (!this.current) return;
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      event.preventDefault();
      this.options.onSkip();
      return;
    }
    if (key === 'enter' || key === ' ' || key === 'spacebar') {
      event.preventDefault();
      this.options.onAdvance();
    }
  }
}
