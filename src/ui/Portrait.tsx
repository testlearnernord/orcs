import { getPortraitAsset } from '@sim/portraits';
import type { Officer } from '@sim/types';
import { ArtConfig } from '../config/art';
import {
  chooseTileIndex,
  resolveTile,
  loadAtlases,
  type AtlasBundle
} from '../features/portraits/atlas';

export interface PortraitOptions {
  size?: number;
  ringColor?: string;
  dead?: boolean;
  className?: string;
}

const DEAD_FILTER = 'grayscale(0.9) brightness(0.85)';
const DEFAULT_SIZE = 88;

export default class Portrait {
  readonly element: HTMLDivElement;
  private officer: Officer;
  private options: PortraitOptions;
  private requestToken = 0;
  private static cachedBundle: AtlasBundle | null | undefined;
  private static pending: Promise<AtlasBundle | null> | null = null;

  constructor(officer: Officer, options: PortraitOptions = {}) {
    this.officer = officer;
    this.options = { ...options };
    this.element = document.createElement('div');
    this.element.classList.add('portrait');
    if (options.className) {
      options.className
        .split(' ')
        .filter(Boolean)
        .forEach((cls) => this.element.classList.add(cls));
    }
    this.element.setAttribute('aria-hidden', 'true');
    this.element.style.backgroundRepeat = 'no-repeat';
    this.element.style.backgroundColor = '#1d2531';
    this.update(officer, options);
  }

  update(officer: Officer, options: PortraitOptions = {}): void {
    this.officer = officer;
    this.options = { ...this.options, ...options };
    const size = this.options.size ?? DEFAULT_SIZE;
    this.element.style.width = `${size}px`;
    this.element.style.height = `${size}px`;
    if (this.options.ringColor) {
      this.element.style.boxShadow = `0 0 0 3px ${this.options.ringColor} inset, 0 0 18px ${this.options.ringColor}33`;
    } else {
      this.element.style.removeProperty('box-shadow');
    }
    const dead = this.options.dead ?? officer.status === 'DEAD';
    this.element.style.filter = dead ? DEAD_FILTER : 'none';
    this.requestToken += 1;
    const currentToken = this.requestToken;

    if (ArtConfig.active !== 'realistic') {
      this.applyLegacy(officer);
      return;
    }

    const bundle = Portrait.cachedBundle;
    if (bundle) {
      this.applyRealistic(bundle, officer);
      return;
    }
    if (Portrait.cachedBundle === null) {
      this.applyLegacy(officer);
      return;
    }
    this.applyLegacy(officer);
    Portrait.ensureBundle()
      .then((loaded) => {
        if (!loaded) return;
        if (currentToken !== this.requestToken) return;
        if (ArtConfig.active !== 'realistic') return;
        this.applyRealistic(loaded, this.officer);
      })
      .catch(() => {
        // Silent fallback to legacy
      });
  }

  private applyLegacy(officer: Officer): void {
    const legacy = getPortraitAsset(officer.portraitSeed);
    if (legacy) {
      this.element.style.backgroundImage = `url("${legacy}")`;
      this.element.style.backgroundSize = 'cover';
      this.element.style.backgroundPosition = 'center';
    } else {
      this.element.style.backgroundImage = 'none';
      this.element.style.backgroundSize = 'cover';
      this.element.style.backgroundPosition = 'center';
    }
  }

  private applyRealistic(bundle: AtlasBundle, officer: Officer): void {
    if (bundle.totalTiles <= 0) {
      this.applyLegacy(officer);
      return;
    }
    const size = this.options.size ?? DEFAULT_SIZE;
    const seed = `${officer.id}|${officer.name}|${officer.level}|${
      officer.traits?.join(',') ?? ''
    }`;
    const index = chooseTileIndex(seed, bundle.totalTiles);
    const { atlas, col, row } = resolveTile(bundle, index);
    const width = atlas.cols * size;
    const height = atlas.rows * size;
    this.element.style.backgroundImage = `url("${atlas.url}")`;
    this.element.style.backgroundSize = `${width}px ${height}px`;
    this.element.style.backgroundPosition = `-${col * size}px -${row * size}px`;
  }

  private static ensureBundle(): Promise<AtlasBundle | null> {
    if (this.cachedBundle !== undefined) {
      return Promise.resolve(this.cachedBundle);
    }
    if (this.pending) {
      return this.pending;
    }
    this.pending = loadAtlases()
      .then((bundle) => {
        this.cachedBundle = bundle;
        return bundle;
      })
      .catch(() => {
        this.cachedBundle = null;
        return null;
      })
      .finally(() => {
        this.pending = null;
      });
    return this.pending;
  }
}
