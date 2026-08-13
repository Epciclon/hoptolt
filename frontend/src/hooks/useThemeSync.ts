'use client';
import { useEffect } from 'react';

export function applyThemeToDOM(fontSize: string, fontFamily: string, bold: boolean, theme: string = 'light', avatarScale: string = '1') {
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
  document.documentElement.style.setProperty('--avatar-scale', avatarScale);
}

export function useThemeSync() {
  const pathname = require('next/navigation').usePathname();
  
  useEffect(() => {
    const applyCurrentTheme = () => {
      const size = localStorage.getItem('fontSize') ?? '16px';
      const family = localStorage.getItem('fontFamily') ?? '';
      const bld = localStorage.getItem('fontBold') === 'true';
      const thm = localStorage.getItem('theme') ?? 'light';
      const avScale = localStorage.getItem('avatarScale') ?? '1';
      applyThemeToDOM(size, family, bld, thm, avScale);
    };

    // Apply immediately on mount and on route change (fixes soft-navigation and BfCache class resets)
    applyCurrentTheme();

    const handleStorage = (e: StorageEvent) => {
      // Sync styles if any relevant key changes
      if (['fontSize', 'fontFamily', 'fontBold', 'theme', 'avatarScale'].includes(e.key || '')) {
        applyCurrentTheme();
      }
    };
    
    // Listen for changes from other tabs
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [pathname]);
}
