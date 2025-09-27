/**
 * Main Menu System for Nemesis Hof
 * Shows start screen with SPECTATE, PLAYER, FREE ROAM options
 */

import { AudioManager } from '@ui/audio/manager';

export type MenuMode = 'spectate' | 'player' | 'freeRoam';

export interface MainMenuEvents {
  'menu:select': MenuMode;
}

export class MainMenu {
  private container: HTMLElement | null = null;
  private listeners: Map<
    keyof MainMenuEvents,
    Array<(mode: MenuMode) => void>
  > = new Map();
  private audioManager: AudioManager;

  constructor(audioManager: AudioManager) {
    this.audioManager = audioManager;
  }

  on<K extends keyof MainMenuEvents>(
    event: K,
    handler: (mode: MenuMode) => void
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  private emit<K extends keyof MainMenuEvents>(event: K, mode: MenuMode): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(mode));
    }
  }

  mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.className = 'main-menu-overlay';

    this.container.innerHTML = `
      <div class="main-menu">
        <div class="main-menu-background">
          <img src="/orcs/assets/start-screen.svg" alt="Nemesis Hof Start Screen" class="start-screen-image" />
        </div>
        <div class="main-menu-content">
          <div class="main-menu-title">
            <h1>NEMESIS HOF</h1>
          </div>
          <div class="main-menu-options">
            <button class="menu-option" data-mode="spectate">
              <span class="option-title">SPECTATE</span>
              <span class="option-description">Beobachte die Orc-Hierarchie</span>
            </button>
            <button class="menu-option menu-option-disabled" data-mode="player" disabled>
              <span class="option-title">PLAYER</span>
              <span class="option-description">Nicht verfügbar</span>
            </button>
            <button class="menu-option" data-mode="freeRoam">
              <span class="option-title">FREE ROAM</span>
              <span class="option-description">Freie Erkundung</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const buttons = this.container.querySelectorAll(
      '.menu-option:not(.menu-option-disabled)'
    );
    buttons.forEach((button) => {
      button.addEventListener('click', (event) => {
        const mode = (event.currentTarget as HTMLElement).getAttribute(
          'data-mode'
        ) as MenuMode;
        if (mode) {
          this.selectMode(mode);
        }
      });
    });

    parent.appendChild(this.container);

    // Initialize audio for main menu
    this.initializeMenuAudio();
  }

  private async initializeMenuAudio(): Promise<void> {
    try {
      // Only try to play audio once per menu instance
      if (this.audioManager.isAudioAvailable()) {
        // Set Whirlpool as current track (index 1)
        this.audioManager.setTrack(1);

        // Set volume to 10%
        this.audioManager.setVolume(0.1);

        // Attempt to auto-start music (may be blocked by browser)
        await this.audioManager.play();
      }
    } catch (error) {
      // Silently handle audio autoplay blocked - this is expected in most browsers
      console.info('[MainMenu] Audio will start after user interaction');
    }
  }

  private selectMode(mode: MenuMode): void {
    this.emit('menu:select', mode);
  }

  destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.listeners.clear();
  }
}
