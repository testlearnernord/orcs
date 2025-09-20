import type { Officer } from '@sim/types';
import { ArtConfig } from '@/config/art';
import {
  chooseTileIndex,
  loadAtlases,
  resolveTile,
  type AtlasBundle
} from '@/features/portraits/atlas';

export interface PortraitProps {
  officer: Officer;
  size?: number;
  ringColor?: string;
  dead?: boolean;
  className?: string;
}

interface ResolvedProps {
  officer: Officer;
  size: number;
  ringColor?: string;
  dead: boolean;
  className?: string;
}

const DEFAULT_SIZE = 88;
const DEAD_FILTER = 'grayscale(0.9) brightness(0.85)';
const PLACEHOLDER_COLOR = '#1d2531';

function withAlpha(color: string): string {
  if (color.startsWith('var(')) return color;
  if (/^#[0-9a-fA-F]{6}$/u.test(color)) return `${color}33`;
  return color;
}

function buildSeed(officer: Officer): string {
  const traits = Array.isArray(officer.traits) ? officer.traits.join(',') : '';
  return `${officer.id}|${officer.name}|${officer.level}|${traits}`;
}

function resolveProps(
  previous: ResolvedProps | undefined,
  next: PortraitProps
): ResolvedProps {
  return {
    officer: next.officer,
    size: next.size ?? previous?.size ?? DEFAULT_SIZE,
    ringColor: next.ringColor ?? previous?.ringColor,
    dead: next.dead ?? previous?.dead ?? false,
    className: next.className ?? previous?.className
  };
}

async function ensureAtlasBundle(): Promise<AtlasBundle | null> {
  try {
    return await loadAtlases();
  } catch {
    return null;
  }
}

export default class Portrait {
  readonly element: HTMLDivElement;
  private props: ResolvedProps;
  private requestId = 0;
  private disposed = false;
  private baseClass?: string;

  constructor(props: PortraitProps) {
    this.element = document.createElement('div');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.style.backgroundRepeat = 'no-repeat';
    this.props = resolveProps(undefined, props);
    this.applyClassName(this.props.className);
    this.applyFrame(this.props);
    this.applyPlaceholder();
    void this.render(this.props);
  }

  update(props: PortraitProps): void {
    if (this.disposed) return;
    this.props = resolveProps(this.props, props);
    this.applyClassName(this.props.className);
    this.applyFrame(this.props);
    void this.render(this.props);
  }

  destroy(): void {
    this.disposed = true;
    this.element.replaceChildren();
  }

  private applyClassName(className?: string): void {
    this.baseClass = className;
    this.updateClassList(false);
  }

  private updateClassList(active: boolean): void {
    const classes = ['portrait'];
    if (active) {
      classes.push('portrait--active');
    }
    if (this.baseClass) {
      classes.push(this.baseClass);
    }
    this.element.className = classes.join(' ');
  }

  private applyFrame(props: ResolvedProps): void {
    const size = `${props.size}px`;
    this.element.style.width = size;
    this.element.style.height = size;
    this.element.style.filter = props.dead ? DEAD_FILTER : 'none';
    if (props.ringColor) {
      const glow = withAlpha(props.ringColor);
      this.element.style.boxShadow = `0 0 0 3px ${props.ringColor} inset, 0 0 18px ${glow}`;
    } else {
      this.element.style.boxShadow = '';
    }
  }

  private async render(props: ResolvedProps): Promise<void> {
    if (ArtConfig.active !== 'realistic') {
      this.applyPlaceholder();
      return;
    }

    const requestId = ++this.requestId;
    const bundle = await ensureAtlasBundle();
    if (
      this.disposed ||
      requestId !== this.requestId ||
      !bundle ||
      bundle.totalTiles === 0
    ) {
      if (!this.disposed) {
        this.applyPlaceholder();
      }
      return;
    }

    this.showAtlas(bundle, props);
  }

  private showAtlas(bundle: AtlasBundle, props: ResolvedProps): void {
    const { officer, size } = props;
    const seed = buildSeed(officer);
    const globalIndex = chooseTileIndex(seed, bundle.totalTiles);
    const { atlas, col, row } = resolveTile(bundle, globalIndex);

    this.element.style.backgroundColor = 'transparent';
    this.element.style.backgroundImage = `url("${atlas.url}")`;
    this.element.style.backgroundSize = `${atlas.cols * size}px ${atlas.rows * size}px`;
    this.element.style.backgroundPosition = `-${col * size}px -${row * size}px`;
    this.updateClassList(true);
  }

  private applyPlaceholder(): void {
    this.element.style.backgroundColor = PLACEHOLDER_COLOR;
    this.element.style.backgroundImage = 'none';
    this.element.style.backgroundSize = '';
    this.element.style.backgroundPosition = '';
    this.updateClassList(false);
  }
}

export function createPortrait(props: PortraitProps): Portrait {
  return new Portrait(props);
}
