/**
 * Ein deterministischer Xorshift-RNG, der in allen Systemen genutzt wird.
 * Alle Zufallsentscheidungen laufen über diese Klasse, damit Seeds
 * reproduzierbare Welten erzeugen.
 */
export class RNG {
  private state: number;

  /**
   * Erstellt einen neuen Generator.
   *
   * @example
   * const rng = new RNG(42);
   * rng.next(); // => 0.727...
   */
  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * Gibt den nächsten Zufallswert im Intervall [0, 1) zurück.
   *
   * @example
   * const rng = new RNG(1);
   * const value = rng.next();
   */
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0xffffffff;
  }

  /**
   * Gibt eine ganze Zahl im inklusiven Bereich [min, max] zurück.
   *
   * @example
   * const rng = new RNG(7);
   * rng.int(1, 3); // => 2
   */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Gibt true zurück, wenn die Zufallschance erfüllt wurde.
   *
   * @example
   * const rng = new RNG(8);
   * rng.chance(0.5); // => true oder false, reproduzierbar
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Wählt ein Element aus einem Array aus.
   *
   * @example
   * const rng = new RNG(11);
   * rng.pick(["a", "b"]); // => "b"
   */
  pick<T>(arr: T[]): T {
    if (arr.length === 0) throw new Error("Cannot pick from empty array");
    return arr[this.int(0, arr.length - 1)];
  }

  /**
   * Erzeugt eine neue zufällige Permutation.
   *
   * @example
   * const rng = new RNG(3);
   * rng.shuffle([1, 2, 3]); // => [2, 1, 3]
   */
  shuffle<T>(values: T[]): T[] {
    const arr = [...values];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
