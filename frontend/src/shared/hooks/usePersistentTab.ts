'use client';
import { useState, useEffect } from 'react';

export function usePersistentTab(moduleName: string, defaultTab: string) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Only run on the client
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const tabFromUrl = searchParams.get('tab');

    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
      localStorage.setItem(`rabbit_tab_${moduleName}`, tabFromUrl);
      
      // Limpiar la URL sin recargar la página
      searchParams.delete('tab');
      const newUrl = window.location.pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
      window.history.replaceState(null, '', newUrl);
    } else {
      const saved = localStorage.getItem(`rabbit_tab_${moduleName}`);
      if (saved) {
        setActiveTab(saved);
      }
    }
    setIsInitialized(true);
  }, [moduleName]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    localStorage.setItem(`rabbit_tab_${moduleName}`, tabId);
  };

  return { activeTab, handleTabChange, isInitialized };
}
