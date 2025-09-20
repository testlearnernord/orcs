import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ArtConfig } from '@/config/art';
import Portrait, { type PortraitProps } from '@/ui/Portrait';

export type AvatarProps = PortraitProps;

type LegacyFactory = (props: AvatarProps) => JSX.Element | null | undefined;

declare global {
  interface Window {
    __LEGACY_ORC_AVATAR__?: LegacyFactory;
  }
}
export default function Avatar(props: AvatarProps) {
  if (ArtConfig.active === 'legacy') {
    const factory =
      typeof window !== 'undefined'
        ? (window as Window & { __LEGACY_ORC_AVATAR__?: LegacyFactory })
            .__LEGACY_ORC_AVATAR__
        : undefined;
    if (factory) {
      const element = factory(props);
      if (element) return element;
    }
  }
  return <Portrait {...props} />;
}

export class AvatarView {
  readonly element: HTMLDivElement;
  private readonly root: Root;
  private props: AvatarProps;
  private observer: MutationObserver | null = null;
  private destroyed = false;

  constructor(props: AvatarProps) {
    this.element = document.createElement('div');
    this.element.style.display = 'contents';
    this.root = createRoot(this.element);
    this.props = { ...props };
    if (typeof MutationObserver !== 'undefined') {
      this.observer = new MutationObserver(() => {
        if (!document.contains(this.element)) {
          this.destroy();
        }
      });
      this.observer.observe(document.body, { childList: true, subtree: true });
    }
    this.render();
  }

  update(props: AvatarProps): void {
    if (this.destroyed) return;
    this.props = { ...this.props, ...props };
    this.render();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.observer?.disconnect();
    this.observer = null;
    this.root.unmount();
    this.element.replaceChildren();
  }

  private render(): void {
    this.root.render(createElement(Avatar, this.props));
  }
}
