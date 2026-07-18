'use client';

import { ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface DashboardTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function DashboardTabs({ tabs, activeTab, onTabChange }: Readonly<DashboardTabsProps>) {
  return (
    <div className="flex border-b border-strong mb-6 px-6 overflow-x-auto hide-scrollbar">
      {tabs.map((tab) => (
        <button type="button"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === tab.id
              ? 'border-primary-500 text-primary-700 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-500/10 font-semibold'
              : 'border-transparent text-muted hover:text-main hover:border-slate-300 dark:hover:border-slate-600 hover:bg-theme-surface'
          }`}
        >
          {tab.icon && (
            <span className={activeTab === tab.id ? 'text-primary-500' : 'text-theme-faint'}>
              {tab.icon}
            </span>
          )}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
