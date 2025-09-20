import type { PortraitProps } from '@/ui/Portrait';
import Portrait from '@/ui/Portrait';
import LegacyAvatar from '@/ui/legacy/LegacyAvatar';
import { ArtConfig, type ArtSet } from '@/config/art';

export type AvatarProps = PortraitProps;

type AvatarImpl = {
  element: HTMLElement;
  update(props: AvatarProps): void;
  destroy(): void;
};

function createImpl(props: AvatarProps, mode: ArtSet): AvatarImpl {
  if (mode === 'legacy') {
    return new LegacyAvatar(props);
  }
  return new Portrait(props);
}

export default class Avatar {
  element: HTMLElement;
  private impl: AvatarImpl;
  private mode: ArtSet;

  constructor(props: AvatarProps) {
    this.mode = ArtConfig.active;
    this.impl = createImpl(props, this.mode);
    this.element = this.impl.element;
  }

  update(props: AvatarProps): void {
    const nextMode = ArtConfig.active;
    if (nextMode !== this.mode) {
      this.swapImpl(props, nextMode);
      return;
    }
    this.impl.update(props);
  }

  destroy(): void {
    this.impl.destroy();
  }

  private swapImpl(props: AvatarProps, nextMode: ArtSet): void {
    const previousElement = this.element;
    const parent = previousElement.parentElement;
    this.impl.destroy();
    const nextImpl = createImpl(props, nextMode);
    this.impl = nextImpl;
    this.mode = nextMode;
    this.element = nextImpl.element;
    if (parent) {
      parent.replaceChild(nextImpl.element, previousElement);
    }
  }
}
