import LegacyAvatar from '@/ui/legacy/LegacyAvatar';
import type { AvatarProps } from '@/ui/officer/Avatar';

declare global {
  interface Window {
    __LEGACY_ORC_AVATAR__?: (props: AvatarProps) => LegacyAvatar;
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (
    window as Window & {
      __LEGACY_ORC_AVATAR__?: (props: AvatarProps) => LegacyAvatar;
    }
  ).__LEGACY_ORC_AVATAR__ = (props: AvatarProps) => new LegacyAvatar(props);
}
