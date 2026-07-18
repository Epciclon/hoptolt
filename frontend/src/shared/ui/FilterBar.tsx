'use client';

import { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Select } from './Select';
import { cn } from '@/lib/utils';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  placeholder?: string;
  options: FilterOption[];
  value: string;
  onChange: (val: string) => void;
}

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  filters?: FilterConfig[];
  className?: string;
  children?: ReactNode; // For additional actions like clear filters
}

export function FilterBar({
  searchPlaceholder = 'Buscar...',
  searchValue,
  onSearchChange,
  filters = [],
  className,
  children
}: Readonly<FilterBarProps>) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-3 rounded-xl border border-strong shadow-sm", className)}>
      <div className="relative w-full sm:w-80">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-faint">
          <Search size={16} />
        </div>
        <input
          type="text"
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        {filters.map(filter => (
          <div key={filter.key} className="w-full sm:w-40 min-w-[150px] relative">
            <Select
              options={filter.options}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              placeholder={filter.placeholder}
              className={filter.value ? "pr-8" : ""}
            />
            {filter.value && (
              <button
                type="button"
                onClick={() => filter.onChange('')}
                className="absolute right-7 top-1/2 -translate-y-1/2 p-1 text-theme-faint hover:text-red-500 rounded-full transition-colors flex items-center justify-center bg-card"
                title="Limpiar"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        {children}
      </div>
    </div>
  );
}
