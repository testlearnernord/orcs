import { getLegacyPortraitUrl } from '@sim/portraits';
import type { PortraitProps } from '@/ui/Portrait';

interface ResolvedProps {
  officer: PortraitProps['officer'];
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

export default class LegacyAvatar {
  readonly element: HTMLDivElement;
  private props: ResolvedProps;
  private readonly img: HTMLImageElement;
  private baseClass?: string;
  private isActive = false;

  constructor(props: PortraitProps) {
    this.element = document.createElement('div');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.style.backgroundColor = PLACEHOLDER_COLOR;
    this.img = document.createElement('img');
    this.img.alt = '';
    this.img.loading = 'lazy';
    this.img.decoding = 'async';
    this.img.style.width = '100%';
    this.img.style.height = '100%';
    this.img.style.objectFit = 'cover';
    this.img.style.display = 'block';
    this.img.style.borderRadius = 'inherit';
    this.element.appendChild(this.img);
    this.props = resolveProps(undefined, props);
    this.applyClassName(this.props.className);
    this.applyFrame(this.props);
    this.render(this.props);
  }

  update(props: PortraitProps): void {
    this.props = resolveProps(this.props, props);
    this.applyClassName(this.props.className);
    this.applyFrame(this.props);
    this.render(this.props);
  }

  destroy(): void {
    this.img.remove();
    this.element.replaceChildren();
  }

  private applyClassName(className?: string): void {
    this.baseClass = className;
    this.updateClassList();
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

  private render(props: ResolvedProps): void {
    const url = getLegacyPortraitUrl(props.officer.portraitSeed);
    if (url) {
      this.img.src = url;
      this.element.style.backgroundColor = 'transparent';
      this.isActive = true;
    } else {
      this.img.removeAttribute('src');
      this.element.style.backgroundColor = PLACEHOLDER_COLOR;
      this.isActive = false;
    }
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
}
