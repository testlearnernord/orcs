export class RNG {
  private s: number;
  constructor(seed: number) { this.s = seed >>> 0; }
  next() {
    let x = this.s;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.s = x >>> 0;
    return this.s / 0xffffffff;
  }
  int(min: number, max: number) { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick<T>(arr: T[]) { return arr[this.int(0, arr.length - 1)]; }
}