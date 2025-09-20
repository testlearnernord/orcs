import { createElement } from 'react';
import LegacyAvatar from '@/ui/legacy/LegacyAvatar';
import type { AvatarProps } from '@/ui/officer/Avatar';

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (
    window as Window & {
      __LEGACY_ORC_AVATAR__?: (
        props: AvatarProps
      ) => JSX.Element | null | undefined;
    }
  ).__LEGACY_ORC_AVATAR__ = (props: AvatarProps) =>
    createElement(LegacyAvatar, props);
}
