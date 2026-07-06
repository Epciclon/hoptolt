'use client';
import { useState, useEffect } from 'react';

export function usePersistentTab(moduleName: string, defaultTab: string) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`rabbit_tab_${moduleName}`);
    if (saved) {
      setActiveTab(saved);
    }
    setIsInitialized(true);
  }, [moduleName]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    localStorage.setItem(`rabbit_tab_${moduleName}`, tabId);
  };

  return { activeTab, handleTabChange, isInitialized };
}
