'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function usePersistentTab(moduleName: string, defaultTab: string) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [isInitialized, setIsInitialized] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only run on the client
    if (typeof window === 'undefined') return;

    const tabFromUrl = searchParams.get('tab');

    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
      localStorage.setItem(`rabbit_tab_${moduleName}`, tabFromUrl);
      
      // Limpiar la URL sin recargar la página
      const currentParams = new URLSearchParams(window.location.search);
      currentParams.delete('tab');
      const newUrl = window.location.pathname + (currentParams.toString() ? `?${currentParams.toString()}` : '');
      window.history.replaceState(null, '', newUrl);
    } else if (!isInitialized) {
      const saved = localStorage.getItem(`rabbit_tab_${moduleName}`);
      if (saved) {
        setActiveTab(saved);
      }
    }
    setIsInitialized(true);
  }, [moduleName, searchParams, isInitialized]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    localStorage.setItem(`rabbit_tab_${moduleName}`, tabId);
  };

  return { activeTab, handleTabChange, isInitialized };
}
