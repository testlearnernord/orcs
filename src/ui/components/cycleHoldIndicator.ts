/**
 * E-Key Hold Indicator for Cycle Simulation
 * Shows a filling "E" indicator when user holds the E key for 3 seconds
 */

export interface CycleHoldIndicatorOptions {
  holdDuration?: number; // milliseconds, default 3000
  onComplete?: () => void;
  onCancel?: () => void;
}

export class CycleHoldIndicator {
  private root: HTMLDivElement;
  private fillElement: HTMLDivElement;
  private letterElement: HTMLDivElement;
  private options: Required<CycleHoldIndicatorOptions>;
  private startTime: number = 0;
  private animationFrame: number | null = null;
  private isActive: boolean = false;
  private audioContext: AudioContext | null = null;

  constructor(options: CycleHoldIndicatorOptions = {}) {
    this.options = {
      holdDuration: options.holdDuration ?? 3000,
      onComplete: options.onComplete ?? (() => {}),
      onCancel: options.onCancel ?? (() => {})
    };

    this.root = document.createElement('div');
    this.root.className = 'cycle-hold-indicator hidden';

    this.fillElement = document.createElement('div');
    this.fillElement.className = 'cycle-hold-indicator__fill';

    this.letterElement = document.createElement('div');
    this.letterElement.className = 'cycle-hold-indicator__letter';
    this.letterElement.textContent = 'E';

    this.root.appendChild(this.fillElement);
    this.root.appendChild(this.letterElement);
    document.body.appendChild(this.root);
  }

  /**
   * Start the hold indicator
   */
  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.startTime = performance.now();
    this.root.classList.remove('hidden');
    this.fillElement.style.height = '0%';

    this.animate();
  }

  /**
   * Cancel the hold indicator
   */
  cancel(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.root.classList.add('hidden');
    this.fillElement.style.height = '0%';

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.options.onCancel();
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    if (!this.isActive) return;

    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(elapsed / this.options.holdDuration, 1);

    // Update fill height
    this.fillElement.style.height = `${progress * 100}%`;

    if (progress >= 1) {
      // Complete
      this.complete();
    } else {
      this.animationFrame = requestAnimationFrame(this.animate);
    }
  };

  /**
   * Complete the hold action
   */
  private complete(): void {
    this.isActive = false;
    this.root.classList.add('hidden');
    this.fillElement.style.height = '0%';

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Play sound effect
    this.playCycleSound();

    // Trigger callback
    this.options.onComplete();
  }

  /**
   * Play a simple sound effect using Web Audio API
   */
  private playCycleSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Create a simple "whoosh" sound with sweeping frequency
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Sweep from low to high frequency
      oscillator.frequency.setValueAtTime(200, now);
      oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.3);

      // Fade in and out
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

      oscillator.type = 'sine';
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (error) {
      console.warn('Could not play cycle sound:', error);
    }
  }

  /**
   * Check if indicator is currently active
   */
  isShowing(): boolean {
    return this.isActive;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.cancel();
    if (this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
