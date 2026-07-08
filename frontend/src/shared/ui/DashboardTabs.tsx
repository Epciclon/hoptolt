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
    <div className="flex border-b border-slate-200 mb-6 px-6 overflow-x-auto hide-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === tab.id
              ? 'border-primary-500 text-primary-700 bg-primary-50/50 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {tab.icon && (
            <span className={activeTab === tab.id ? 'text-primary-500' : 'text-slate-400'}>
              {tab.icon}
            </span>
          )}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
