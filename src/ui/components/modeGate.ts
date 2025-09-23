import { FLAGS } from '@state/flags';
import type { GameMode } from '@state/ui/mode';

interface ModeGateOptions {
  onConfirm: (mode: GameMode) => void;
}

const MODE_LABEL: Record<GameMode, string> = {
  spectate: 'Spectate',
  player: 'Player',
  freeRoam: 'Free Roam (Test)'
};

export class ModeGate {
  readonly element: HTMLDivElement;
  private readonly options: ModeGateOptions;
  private selection: GameMode = 'spectate';
  private readonly startButton: HTMLButtonElement;
  private readonly spectateButton: HTMLButtonElement;
  private readonly playerButton: HTMLButtonElement;
  private readonly freeRoamButton: HTMLButtonElement;

  constructor(options: ModeGateOptions) {
    this.options = options;
    this.element = document.createElement('div');
    this.element.className = 'mode-gate';
    this.element.innerHTML = `
      <div class="mode-gate__backdrop"></div>
      <section class="mode-gate__panel" role="dialog" aria-modal="true">
        <header>
          <h2>Wähle deinen Modus</h2>
          <p>Erkunde die Nemesis-Hierarchie als Beobachter. Der Spieler-Modus folgt später.</p>
        </header>
        <div class="mode-gate__options">
          <button type="button" data-mode="spectate" class="is-active">
            <span class="mode-gate__mode">Spectate</span>
            <span class="mode-gate__hint">Standardmodus • Keine Spielerfigur</span>
          </button>
          <button type="button" data-mode="freeRoam">
            <span class="mode-gate__mode">Free Roam (Test)</span>
            <span class="mode-gate__hint">Simulation live auf Karte ansehen</span>
          </button>
          <button type="button" data-mode="player" ${
            FLAGS.PLAYER_MODE ? '' : 'class="is-disabled" disabled'
          }>
            <span class="mode-gate__mode">Player</span>
            <span class="mode-gate__hint">Coming soon</span>
          </button>
        </div>
        <footer>
          <button type="button" data-action="start">Los geht's</button>
        </footer>
      </section>
    `;
    document.body.appendChild(this.element);
    this.element.setAttribute('aria-hidden', 'true');
    this.startButton = this.element.querySelector(
      '[data-action="start"]'
    ) as HTMLButtonElement;
    this.spectateButton = this.element.querySelector(
      'button[data-mode="spectate"]'
    ) as HTMLButtonElement;
    this.playerButton = this.element.querySelector(
      'button[data-mode="player"]'
    ) as HTMLButtonElement;
    this.freeRoamButton = this.element.querySelector(
      'button[data-mode="freeRoam"]'
    ) as HTMLButtonElement;
    this.registerEvents();
    this.close();
  }

  open(initial: GameMode = 'spectate'): void {
    this.selection = this.resolveInitial(initial);
    this.syncSelection();
    this.element.classList.add('is-open');
    this.element.removeAttribute('hidden');
    this.element.removeAttribute('aria-hidden');
    requestAnimationFrame(() => this.startButton.focus());
  }

  close(): void {
    this.element.classList.remove('is-open');
    this.element.setAttribute('hidden', 'true');
    this.element.setAttribute('aria-hidden', 'true');
  }

  private resolveInitial(initial: GameMode): GameMode {
    if (initial === 'player' && !FLAGS.PLAYER_MODE) {
      return 'spectate';
    }
    return initial;
  }

  private registerEvents(): void {
    this.element
      .querySelector('.mode-gate__backdrop')
      ?.addEventListener('click', () => this.close());
    this.startButton.addEventListener('click', () => {
      this.options.onConfirm(this.selection);
      this.close();
    });
    this.spectateButton.addEventListener('click', () => {
      this.selection = 'spectate';
      this.syncSelection();
    });
    this.freeRoamButton.addEventListener('click', () => {
      this.selection = 'freeRoam';
      this.syncSelection();
    });
    this.playerButton.addEventListener('click', () => {
      if (!FLAGS.PLAYER_MODE) return;
      this.selection = 'player';
      this.syncSelection();
    });
    if (!FLAGS.PLAYER_MODE) {
      this.playerButton.title = 'Im Spectate-Mode noch nicht verfügbar.';
    }
    this.element.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
    });
  }

  private syncSelection(): void {
    this.spectateButton.classList.toggle(
      'is-active',
      this.selection === 'spectate'
    );
    this.freeRoamButton.classList.toggle(
      'is-active',
      this.selection === 'freeRoam'
    );
    const playerActive = this.selection === 'player';
    this.playerButton.classList.toggle('is-active', playerActive);
    this.startButton.textContent =
      this.selection === 'spectate'
        ? 'Spectate starten'
        : `${MODE_LABEL[this.selection]} starten`;
  }
}
