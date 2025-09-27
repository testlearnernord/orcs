/**
 * Tests for AudioManager functionality
 */
import { describe, it, expect } from 'vitest';
import { AudioManager } from '../manager';

describe('AudioManager', () => {
  describe('basic functionality', () => {
    it('should initialize with correct default state', () => {
      const manager = new AudioManager();
      const state = manager.getState();

      expect(state.isPlaying).toBe(false);
      expect(state.isMuted).toBe(false);
      expect(state.volume).toBe(0.7);
      expect(state.currentTrackIndex).toBe(0);
      expect(state.currentTime).toBe(0);
      expect(state.tracks).toHaveLength(2);

      manager.destroy();
    });

    it('should have track metadata', () => {
      const manager = new AudioManager();
      const currentTrack = manager.getCurrentTrack();

      expect(currentTrack).not.toBeNull();
      expect(currentTrack?.id).toBe('curse-witches');
      expect(currentTrack?.title).toBe('Curse of the Witches');
      expect(currentTrack?.artist).toBe('Jimena Contreras');

      manager.destroy();
    });

    it('should have valid audio URLs with proper base paths', () => {
      const manager = new AudioManager();
      const state = manager.getState();

      // URLs should not start with just '/audio/' (which would fail in production)
      expect(state.tracks[0].url).not.toBe(
        '/audio/curse-of-the-witches-jimena-contreras.mp3'
      );
      expect(state.tracks[1].url).not.toBe(
        '/audio/whirlpool-the-mini-vandals.mp3'
      );

      // URLs should contain the audio filename
      expect(state.tracks[0].url).toContain(
        'curse-of-the-witches-jimena-contreras.mp3'
      );
      expect(state.tracks[1].url).toContain('whirlpool-the-mini-vandals.mp3');

      // URLs should be absolute paths
      expect(state.tracks[0].url).toMatch(/^\/.*audio\/.*\.mp3$/);
      expect(state.tracks[1].url).toMatch(/^\/.*audio\/.*\.mp3$/);

      manager.destroy();
    });

    it('should handle audio URLs that can be properly encoded', () => {
      const manager = new AudioManager();
      const state = manager.getState();

      // Test that URLs with spaces can be properly encoded
      state.tracks.forEach((track) => {
        const url = new URL(track.url, 'http://localhost');
        expect(url.pathname).toContain('audio/');
        // The URL constructor should handle encoding automatically
        expect(() => encodeURI(track.url)).not.toThrow();
      });

      manager.destroy();
    });

    it('should navigate between tracks', () => {
      const manager = new AudioManager();

      // Start with first track
      expect(manager.getCurrentTrack()?.id).toBe('curse-witches');

      // Go to next track
      manager.nextTrack();
      expect(manager.getCurrentTrack()?.id).toBe('whirlpool');

      // Go to next track (should cycle back to first)
      manager.nextTrack();
      expect(manager.getCurrentTrack()?.id).toBe('curse-witches');

      // Go to previous track
      manager.previousTrack();
      expect(manager.getCurrentTrack()?.id).toBe('whirlpool');

      manager.destroy();
    });

    it('should handle volume controls', () => {
      const manager = new AudioManager();

      // Test volume setting
      manager.setVolume(0.5);
      expect(manager.getState().volume).toBe(0.5);

      // Test volume bounds
      manager.setVolume(1.5); // Should be clamped to 1.0
      expect(manager.getState().volume).toBe(1.0);

      manager.setVolume(-0.5); // Should be clamped to 0.0
      expect(manager.getState().volume).toBe(0.0);

      // Test mute toggle
      expect(manager.getState().isMuted).toBe(false);
      manager.toggleMute();
      expect(manager.getState().isMuted).toBe(true);
      manager.toggleMute();
      expect(manager.getState().isMuted).toBe(false);

      manager.destroy();
    });
  });
});
