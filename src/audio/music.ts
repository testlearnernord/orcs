/**
 * Player Mode dedicated audio system
 * Handles background music switching between specific tracks
 */

export interface PlayerMusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
}

export interface PlayerMusicState {
  currentTrackId: string;
  isPlaying: boolean;
  volume: number;
  crossfading: boolean;
}

// Get the correct base URL for audio assets
const rawBase = (import.meta as any)?.env?.BASE_URL ?? '/';
const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
const developmentBase = normalizedBase === '/' ? '/orcs/' : normalizedBase;

/**
 * Player Mode Music System
 * Handles crossfading between two specific tracks for combat
 */
export class PlayerMusicManager {
  private readonly tracks: Record<string, PlayerMusicTrack> = {
    higher_octane: {
      id: 'higher_octane',
      title: 'Higher Octane',
      artist: 'Vans in Japan',
      url: `${developmentBase}audio/Higher-Octane-Vans-in-Japan.mp3`
    },
    cthulthu: {
      id: 'cthulthu',
      title: 'Cthulthu',
      artist: 'Quincas Moreira',
      url: `${developmentBase}audio/Chtulthu-Quincas-Moreira.mp3`
    }
  };

  private currentAudio: HTMLAudioElement | null = null;
  private nextAudio: HTMLAudioElement | null = null;
  private state: PlayerMusicState;
  private crossfadeTimeoutId: number | null = null;

  constructor() {
    this.state = {
      currentTrackId: 'higher_octane',
      isPlaying: false,
      volume: 0.6,
      crossfading: false
    };
  }

  /**
   * Initialize and start playing the default track
   */
  async init(): Promise<void> {
    try {
      await this.playTrack('higher_octane');
    } catch (error) {
      console.warn('[PlayerMusic] Failed to start music:', error);
    }
  }

  /**
   * Play a specific track by ID
   */
  async playTrack(trackId: string): Promise<void> {
    const track = this.tracks[trackId];
    if (!track) {
      console.warn(`[PlayerMusic] Track not found: ${trackId}`);
      return;
    }

    // Stop current track if playing
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    // Create new audio element
    this.currentAudio = new Audio(track.url);
    this.currentAudio.loop = true;
    this.currentAudio.volume = this.state.volume;

    // Set up event listeners
    this.currentAudio.addEventListener('error', (error) => {
      console.warn('[PlayerMusic] Audio error:', error);
    });

    try {
      await this.currentAudio.play();
      this.state.currentTrackId = trackId;
      this.state.isPlaying = true;
    } catch (error) {
      console.warn('[PlayerMusic] Failed to play track:', error);
      this.state.isPlaying = false;
    }
  }

  /**
   * Toggle between the two available tracks with crossfade
   */
  async toggle(): Promise<void> {
    if (this.state.crossfading) {
      return; // Already crossfading, ignore
    }

    const nextTrackId = this.state.currentTrackId === 'higher_octane' 
      ? 'cthulthu' 
      : 'higher_octane';

    await this.crossfade(nextTrackId);
  }

  /**
   * Crossfade to a specific track
   */
  async crossfade(toTrackId: string, fadeTimeMs: number = 600): Promise<void> {
    if (this.state.crossfading) {
      return;
    }

    const toTrack = this.tracks[toTrackId];
    if (!toTrack) {
      console.warn(`[PlayerMusic] Cannot crossfade to unknown track: ${toTrackId}`);
      return;
    }

    this.state.crossfading = true;

    try {
      // Prepare next track
      this.nextAudio = new Audio(toTrack.url);
      this.nextAudio.loop = true;
      this.nextAudio.volume = 0; // Start silent
      
      // Start playing next track
      await this.nextAudio.play();

      // Crossfade both tracks
      const steps = 20;
      const stepTime = fadeTimeMs / steps;
      const currentAudio = this.currentAudio;

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const newVolume = this.state.volume * progress;
        const oldVolume = this.state.volume * (1 - progress);

        if (this.nextAudio) {
          this.nextAudio.volume = Math.min(1, Math.max(0, newVolume));
        }
        if (currentAudio) {
          currentAudio.volume = Math.min(1, Math.max(0, oldVolume));
        }

        if (i < steps) {
          await new Promise(resolve => setTimeout(resolve, stepTime));
        }
      }

      // Cleanup old audio
      if (currentAudio) {
        currentAudio.pause();
      }

      // Switch references
      this.currentAudio = this.nextAudio;
      this.nextAudio = null;
      this.state.currentTrackId = toTrackId;
      
    } catch (error) {
      console.warn('[PlayerMusic] Crossfade failed:', error);
      // Fallback to simple track switch
      await this.playTrack(toTrackId);
    } finally {
      this.state.crossfading = false;
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this.state.volume = Math.min(1, Math.max(0, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.state.volume;
    }
  }

  /**
   * Get current state
   */
  getState(): Readonly<PlayerMusicState> {
    return { ...this.state };
  }

  /**
   * Get current track info
   */
  getCurrentTrack(): PlayerMusicTrack | null {
    return this.tracks[this.state.currentTrackId] || null;
  }

  /**
   * Stop and cleanup
   */
  destroy(): void {
    if (this.crossfadeTimeoutId) {
      clearTimeout(this.crossfadeTimeoutId);
    }

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    if (this.nextAudio) {
      this.nextAudio.pause();
      this.nextAudio = null;
    }

    this.state.isPlaying = false;
  }
}