import type { Officer } from '@sim/types';
import { getLegacyPortraitUrl } from '@sim/portraits';
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
  private fallbackImg: HTMLImageElement | null = null;
  private disposed = false;
  private baseClass?: string;
  private isActive = false;

  constructor(props: PortraitProps) {
    this.element = document.createElement('div');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.style.backgroundColor = PLACEHOLDER_COLOR;
    this.element.style.backgroundRepeat = 'no-repeat';
    this.props = resolveProps(undefined, props);
    this.applyClassName(this.props.className);
    this.applyFrame(this.props);
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
    this.clearFallback();
    this.element.replaceChildren();
  }

  private applyClassName(className?: string): void {
    this.baseClass = className;
    this.updateClassList();
  }

  private updateClassList(): void {
    const classes = ['portrait'];
    if (this.isActive) {
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
      this.showLegacy(props);
      return;
    }

    const requestId = ++this.requestId;
    const bundle = await ensureAtlasBundle();
    if (this.disposed || requestId !== this.requestId) return;
    if (!bundle || bundle.totalTiles === 0) {
      this.showLegacy(props);
      return;
    }
    this.showAtlas(bundle, props);
  }

  private showLegacy(props: ResolvedProps): void {
    this.isActive = false;
    this.updateClassList();
    const url = getLegacyPortraitUrl(props.officer.portraitSeed);
    if (url) {
      this.applyFallback(url);
    } else {
      this.applyPlaceholder();
    }
  }

  private showAtlas(bundle: AtlasBundle, props: ResolvedProps): void {
    const { officer, size } = props;
    const seed = buildSeed(officer);
    const globalIndex = chooseTileIndex(seed, bundle.totalTiles);
    const { atlas, col, row } = resolveTile(bundle, globalIndex);
    this.clearFallback();
    this.isActive = true;
    this.updateClassList();
    this.element.style.backgroundImage = `url("${atlas.url}")`;
    this.element.style.backgroundSize = `${atlas.cols * size}px ${atlas.rows * size}px`;
    this.element.style.backgroundPosition = `-${col * size}px -${row * size}px`;
  }

  private applyFallback(url: string): void {
    if (!this.fallbackImg) {
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.display = 'block';
      img.style.borderRadius = 'inherit';
      this.element.appendChild(img);
      this.fallbackImg = img;
    }
    this.element.style.backgroundImage = 'none';
    this.element.style.backgroundSize = '';
    this.element.style.backgroundPosition = '';
    this.element.style.backgroundRepeat = 'no-repeat';
    this.fallbackImg.src = url;
  }

  private applyPlaceholder(): void {
    this.clearFallback();
    this.isActive = false;
    this.updateClassList();
    this.element.style.backgroundImage = 'none';
    this.element.style.backgroundSize = '';
    this.element.style.backgroundPosition = '';
  }

  private clearFallback(): void {
    if (this.fallbackImg) {
      this.fallbackImg.remove();
      this.fallbackImg = null;
    }
  }
}

export function createPortrait(props: PortraitProps): Portrait {
  return new Portrait(props);
}
