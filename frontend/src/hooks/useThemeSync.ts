'use client';
import { useEffect } from 'react';

export function applyThemeToDOM(fontSize: string, fontFamily: string, bold: boolean, theme: string = 'light') {
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
  document.documentElement.classList.remove('theme-dark', 'theme-contrast');
  if (theme === 'dark') {
    document.documentElement.classList.add('theme-dark');
  } else if (theme === 'contrast') {
    document.documentElement.classList.add('theme-contrast');
  }
}

export function useThemeSync() {
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      // Sync styles if any relevant key changes
      if (['fontSize', 'fontFamily', 'fontBold', 'theme'].includes(e.key || '')) {
        const size = localStorage.getItem('fontSize') ?? '16px';
        const family = localStorage.getItem('fontFamily') ?? '';
        const bld = localStorage.getItem('fontBold') === 'true';
        const thm = localStorage.getItem('theme') ?? 'light';
        applyThemeToDOM(size, family, bld, thm);
      }
    };
    
    // Listen for changes from other tabs
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
}
