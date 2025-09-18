/**
 * Deterministic, seedable random number generator based on a xorshift32
 * sequence. The implementation is tiny but perfectly adequate for the sim and
 * guarantees repeatable warcall results, officer creation and asset mapping.
 */
export class RNG {
  private state: number;

  constructor(seed: string | number) {
    let value = 0;
    const normalized = typeof seed === 'number' ? seed.toString() : seed;
    for (let i = 0; i < normalized.length; i += 1) {
      value = (value << 5) - value + normalized.charCodeAt(i);
      value |= 0;
    }
    this.state = value || 0x6d2b79f5;
  }

  next(): number {
    // xorshift32
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 0x100000000;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return items[Math.floor(this.next() * items.length)];
  }

  shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  fork(label: string): RNG {
    return new RNG(`${label}:${this.state}`);
  }
}
