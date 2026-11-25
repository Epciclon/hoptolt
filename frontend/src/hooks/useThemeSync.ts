'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export type AvatarShape = 'circle' | 'rounded' | 'square';

export const DEFAULT_AVATAR_SCALE = '1.25';
export const DEFAULT_AVATAR_SHAPE: AvatarShape = 'circle';

const AVATAR_SHAPE_RADII: Record<AvatarShape, { normal: string; small: string }> = {
  circle: { normal: '9999px', small: '9999px' },
  rounded: { normal: '0.75rem', small: '0.375rem' },
  square: { normal: '0px', small: '0px' },
};

export function parseAvatarShape(value: string | null): AvatarShape {
  if (value === 'rounded' || value === 'square' || value === 'circle') {
    return value;
  }
  return DEFAULT_AVATAR_SHAPE;
}

export function applyThemeToDOM(
  fontSize: string,
  fontFamily: string,
  bold: boolean,
  theme: string = 'light',
  avatarScale: string = DEFAULT_AVATAR_SCALE,
  avatarShape: AvatarShape = DEFAULT_AVATAR_SHAPE,
) {
  document.documentElement.style.fontSize = fontSize;
  if (fontFamily) {
    document.body.style.fontFamily = fontFamily;
  } else {
    document.body.style.removeProperty('font-family');
  }
  if (bold) {
    document.documentElement.classList.add('theme-bold');
  } else {
    document.documentElement.classList.remove('theme-bold');
  }
  document.documentElement.classList.remove('theme-dark', 'theme-contrast', 'dark');
  if (theme === 'dark') {
    document.documentElement.classList.add('theme-dark', 'dark');
  } else if (theme === 'contrast') {
    document.documentElement.classList.add('theme-contrast', 'dark');
  }

  const radii = AVATAR_SHAPE_RADII[avatarShape] ?? AVATAR_SHAPE_RADII[DEFAULT_AVATAR_SHAPE];
  document.documentElement.style.setProperty('--avatar-scale', avatarScale || DEFAULT_AVATAR_SCALE);
  document.documentElement.style.setProperty('--avatar-radius', radii.normal);
  document.documentElement.style.setProperty('--avatar-radius-sm', radii.small);
}

export function useThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    const applyCurrentTheme = () => {
      const size = localStorage.getItem('fontSize') ?? '16px';
      const family = localStorage.getItem('fontFamily') ?? '';
      const bld = localStorage.getItem('fontBold') === 'true';
      const thm = localStorage.getItem('theme') ?? 'light';
      const avScale = localStorage.getItem('avatarScale') ?? DEFAULT_AVATAR_SCALE;
      const avShape = parseAvatarShape(localStorage.getItem('avatarShape'));
      applyThemeToDOM(size, family, bld, thm, avScale, avShape);
    };

    // Apply immediately on mount and on route change (fixes soft-navigation and BfCache class resets)
    applyCurrentTheme();

    const handleStorage = (e: StorageEvent) => {
      if (['fontSize', 'fontFamily', 'fontBold', 'theme', 'avatarScale', 'avatarShape'].includes(e.key || '')) {
        applyCurrentTheme();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [pathname]);
}
