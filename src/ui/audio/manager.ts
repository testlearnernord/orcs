/**
 * Audio Manager for background music and sound effects
 * Handles playback, volume control, and track management
 */

// Get the correct base URL for audio assets
const rawBase = (import.meta as any)?.env?.BASE_URL ?? '/';
const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

// Fallback to correct base path for dev environment where BASE_URL might not be set correctly
const developmentBase = normalizedBase === '/' ? '/orcs/' : normalizedBase;

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration?: number;
}

export interface AudioState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0-1
  currentTrackIndex: number;
  currentTime: number;
  tracks: AudioTrack[];
}

export type AudioEventName = 'stateChange' | 'trackChange' | 'error';

export class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private state: AudioState;
  private listeners: Map<AudioEventName, Array<(data?: any) => void>> =
    new Map();
  private audioAvailable: boolean = true;
  private errorLogged: boolean = false;

  constructor() {
    this.state = {
      isPlaying: false,
      isMuted: false,
      volume: 0.7, // Default 70% volume
      currentTrackIndex: 0,
      currentTime: 0,
      tracks: [
        {
          id: 'curse-witches',
          title: 'Curse of the Witches',
          artist: 'Jimena Contreras',
          url: `${developmentBase}audio/Curse-of-the-Witches-Jimena-Contreras.mp3`
        },
        {
          id: 'whirlpool',
          title: 'Whirlpool',
          artist: 'The Mini Vandals',
          url: `${developmentBase}audio/Whirlpool-The-Mini-Vandals.mp3`
        }
      ]
    };

    this.initializeAudio();
    this.loadUserPreferences();
  }

  private initializeAudio(): void {
    this.audio = new Audio();
    this.audio.loop = false; // We'll handle track cycling manually
    this.audio.preload = 'none'; // Don't preload to avoid immediate errors

    // Set up event listeners
    this.audio.addEventListener('loadedmetadata', () => {
      const track = this.getCurrentTrack();
      if (track) {
        track.duration = this.audio?.duration || 0;
      }
    });

    this.audio.addEventListener('ended', () => {
      this.nextTrack();
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) {
        this.state.currentTime = this.audio.currentTime;
        this.emit('stateChange', this.state);
      }
    });

    this.audio.addEventListener('error', (error) => {
      // Only log audio errors once to prevent console spam
      if (!this.errorLogged) {
        console.warn(
          '[AudioManager] Audio files not available - music disabled'
        );
        this.errorLogged = true;
      }
      this.audioAvailable = false;
      this.emit('error', error);
    });

    // Load initial track (but don't preload)
    this.loadCurrentTrack();
  }

  private loadUserPreferences(): void {
    try {
      const saved = localStorage.getItem('nemesis-audio-preferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        this.state.volume = prefs.volume ?? this.state.volume;
        this.state.isMuted = prefs.isMuted ?? this.state.isMuted;
        this.state.currentTrackIndex =
          prefs.currentTrackIndex ?? this.state.currentTrackIndex;

        if (this.audio) {
          this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
        }
      }
    } catch (error) {
      console.warn('[AudioManager] Could not load user preferences:', error);
    }
  }

  private saveUserPreferences(): void {
    try {
      const prefs = {
        volume: this.state.volume,
        isMuted: this.state.isMuted,
        currentTrackIndex: this.state.currentTrackIndex
      };
      localStorage.setItem('nemesis-audio-preferences', JSON.stringify(prefs));
    } catch (error) {
      console.warn('[AudioManager] Could not save user preferences:', error);
    }
  }

  private loadCurrentTrack(): void {
    const track = this.getCurrentTrack();
    if (track && this.audio && this.audioAvailable) {
      // Ensure URL is properly encoded for HTML Audio element
      this.audio.src = encodeURI(track.url);
      this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
    }
  }

  private emit(eventName: AudioEventName, data?: any): void {
    const handlers = this.listeners.get(eventName) || [];
    handlers.forEach((handler) => handler(data));
  }

  // Public API
  on(eventName: AudioEventName, handler: (data?: any) => void): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)!.push(handler);
  }

  off(eventName: AudioEventName, handler: (data?: any) => void): void {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  getState(): AudioState {
    return { ...this.state };
  }

  getCurrentTrack(): AudioTrack | null {
    return this.state.tracks[this.state.currentTrackIndex] || null;
  }

  async play(): Promise<void> {
    if (!this.audio || !this.audioAvailable) return;

    try {
      await this.audio.play();
      this.state.isPlaying = true;
      this.emit('stateChange', this.state);
    } catch (error) {
      const errorName = (error as Error)?.name;
      if (errorName === 'NotAllowedError') {
        console.log(
          '[AudioManager] Autoplay blocked - user interaction required'
        );
      } else if (errorName === 'NotSupportedError') {
        if (!this.errorLogged) {
          console.warn(
            '[AudioManager] Audio files not available - music disabled'
          );
          this.errorLogged = true;
        }
        this.audioAvailable = false;
      } else {
        if (!this.errorLogged) {
          console.warn('[AudioManager] Audio playback failed - music disabled');
          this.errorLogged = true;
        }
        this.audioAvailable = false;
      }
      this.emit('error', error);
    }
  }

  pause(): void {
    if (!this.audio || !this.audioAvailable) return;

    this.audio.pause();
    this.state.isPlaying = false;
    this.emit('stateChange', this.state);
  }

  isAudioAvailable(): boolean {
    return this.audioAvailable;
  }

  togglePlayPause(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    if (this.audio && !this.state.isMuted) {
      this.audio.volume = this.state.volume;
    }
    this.saveUserPreferences();
    this.emit('stateChange', this.state);
  }

  toggleMute(): void {
    this.state.isMuted = !this.state.isMuted;
    if (this.audio) {
      this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
    }
    this.saveUserPreferences();
    this.emit('stateChange', this.state);
  }

  nextTrack(): void {
    this.state.currentTrackIndex =
      (this.state.currentTrackIndex + 1) % this.state.tracks.length;
    this.loadCurrentTrack();
    this.saveUserPreferences();
    this.emit('trackChange', this.getCurrentTrack());

    // Continue playing if we were playing before
    if (this.state.isPlaying) {
      this.play();
    }
  }

  previousTrack(): void {
    this.state.currentTrackIndex =
      this.state.currentTrackIndex === 0
        ? this.state.tracks.length - 1
        : this.state.currentTrackIndex - 1;
    this.loadCurrentTrack();
    this.saveUserPreferences();
    this.emit('trackChange', this.getCurrentTrack());

    // Continue playing if we were playing before
    if (this.state.isPlaying) {
      this.play();
    }
  }

  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = Math.max(
        0,
        Math.min(this.audio.duration || 0, time)
      );
      this.state.currentTime = this.audio.currentTime;
      this.emit('stateChange', this.state);
    }
  }

  destroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.listeners.clear();
  }
}
