export interface Point {
  x: number;
  y: number;
}

export class CircleHitArea {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly radius: number
  ) {}

  contains(point: Point): boolean {
    const dx = point.x - this.x;
    const dy = point.y - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }
}

export class UIContainer {
  children: UIContainer[] = [];
  depth = 0;
  scrollFactor = 1;
  hitArea?: CircleHitArea;
  visible = true;

  constructor(public position: Point = { x: 0, y: 0 }) {}

  add(child: UIContainer): void {
    this.children.push(child);
  }

  setDepth(depth: number): this {
    this.depth = depth;
    return this;
  }

  setScrollFactor(factor: number): this {
    this.scrollFactor = factor;
    return this;
  }

  setCircleHitArea(radius: number): this {
    this.hitArea = new CircleHitArea(this.position.x, this.position.y, radius);
    return this;
  }

  hitTest(point: Point): boolean {
    if (!this.hitArea) return false;
    return this.hitArea.contains(point);
  }
}
