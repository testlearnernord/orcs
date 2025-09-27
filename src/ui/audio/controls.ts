/**
 * Audio Controls UI Component
 * Provides user interface for audio playback control
 */

import type { AudioManager, AudioState } from './manager';

export interface AudioControlsOptions {
  onVolumeChange?: (volume: number) => void;
  onPlayPause?: () => void;
  onNextTrack?: () => void;
  onPreviousTrack?: () => void;
  onMute?: () => void;
}

export class AudioControls {
  private root: HTMLDivElement;
  private playButton!: HTMLButtonElement;
  private muteButton!: HTMLButtonElement;
  private volumeSlider!: HTMLInputElement;
  private trackInfo!: HTMLSpanElement;
  private prevButton!: HTMLButtonElement;
  private nextButton!: HTMLButtonElement;
  private audioManager: AudioManager;

  constructor(audioManager: AudioManager, options: AudioControlsOptions = {}) {
    this.audioManager = audioManager;
    this.root = this.createControls();
    this.setupEventListeners(options);
    this.updateDisplay(audioManager.getState());

    // Listen for audio state changes
    audioManager.on('stateChange', (state) => this.updateDisplay(state));
    audioManager.on('trackChange', (track) => this.updateTrackDisplay(track));
  }

  private createControls(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'audio-controls';
    container.innerHTML = `
      <div class="audio-controls__track">
        <button class="audio-controls__prev" aria-label="Vorheriger Track" title="Vorheriger Track">‹</button>
        <button class="audio-controls__play" aria-label="Wiedergabe/Pause" title="Wiedergabe/Pause">▶</button>
        <button class="audio-controls__next" aria-label="Nächster Track" title="Nächster Track">›</button>
      </div>
      <div class="audio-controls__info">
        <span class="audio-controls__track-info">Keine Musik</span>
      </div>
      <div class="audio-controls__volume">
        <button class="audio-controls__mute" aria-label="Stumm schalten" title="Stumm schalten">🔊</button>
        <input type="range" class="audio-controls__slider" min="0" max="100" value="70" aria-label="Lautstärke">
      </div>
    `;

    // Cache element references
    this.playButton = container.querySelector(
      '.audio-controls__play'
    ) as HTMLButtonElement;
    this.muteButton = container.querySelector(
      '.audio-controls__mute'
    ) as HTMLButtonElement;
    this.volumeSlider = container.querySelector(
      '.audio-controls__slider'
    ) as HTMLInputElement;
    this.trackInfo = container.querySelector(
      '.audio-controls__track-info'
    ) as HTMLSpanElement;
    this.prevButton = container.querySelector(
      '.audio-controls__prev'
    ) as HTMLButtonElement;
    this.nextButton = container.querySelector(
      '.audio-controls__next'
    ) as HTMLButtonElement;

    return container;
  }

  private setupEventListeners(options: AudioControlsOptions): void {
    this.playButton.addEventListener('click', () => {
      this.audioManager.togglePlayPause();
      options.onPlayPause?.();
    });

    this.muteButton.addEventListener('click', () => {
      this.audioManager.toggleMute();
      options.onMute?.();
    });

    this.volumeSlider.addEventListener('input', () => {
      const volume = parseInt(this.volumeSlider.value) / 100;
      this.audioManager.setVolume(volume);
      options.onVolumeChange?.(volume);
    });

    this.prevButton.addEventListener('click', () => {
      this.audioManager.previousTrack();
      options.onPreviousTrack?.();
    });

    this.nextButton.addEventListener('click', () => {
      this.audioManager.nextTrack();
      options.onNextTrack?.();
    });
  }

  private updateDisplay(state: AudioState): void {
    // Update play/pause button
    this.playButton.textContent = state.isPlaying ? '⏸' : '▶';
    this.playButton.setAttribute(
      'aria-label',
      state.isPlaying ? 'Pause' : 'Wiedergabe'
    );
    this.playButton.setAttribute(
      'title',
      state.isPlaying ? 'Pause' : 'Wiedergabe'
    );

    // Update mute button
    this.muteButton.textContent = state.isMuted ? '🔇' : '🔊';
    this.muteButton.setAttribute(
      'aria-label',
      state.isMuted ? 'Ton einschalten' : 'Stumm schalten'
    );
    this.muteButton.setAttribute(
      'title',
      state.isMuted ? 'Ton einschalten' : 'Stumm schalten'
    );

    // Update volume slider
    this.volumeSlider.value = Math.round(state.volume * 100).toString();
    this.volumeSlider.disabled = state.isMuted;

    // Update track info
    const track = state.tracks[state.currentTrackIndex];
    if (track) {
      this.trackInfo.textContent = `${track.title} – ${track.artist}`;
      this.trackInfo.setAttribute(
        'title',
        `${track.title} von ${track.artist}`
      );
    } else {
      this.trackInfo.textContent = 'Keine Musik';
      this.trackInfo.removeAttribute('title');
    }

    // Enable/disable track navigation
    this.prevButton.disabled = state.tracks.length <= 1;
    this.nextButton.disabled = state.tracks.length <= 1;
  }

  private updateTrackDisplay(track: any): void {
    if (track) {
      this.trackInfo.textContent = `${track.title} – ${track.artist}`;
      this.trackInfo.setAttribute(
        'title',
        `${track.title} von ${track.artist}`
      );
    }
  }

  getElement(): HTMLDivElement {
    return this.root;
  }

  destroy(): void {
    this.root.remove();
  }
}
