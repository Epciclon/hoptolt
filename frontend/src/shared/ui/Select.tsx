'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, Readonly<SelectProps>>(
  ({ label, error, hint, options, placeholder, className, id, required, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-main">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border bg-theme-surface dark:bg-slate-900 border-default text-main dark:text-slate-100',
            'transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:bg-theme-surface dark:disabled:bg-slate-800 disabled:text-theme-faint disabled:cursor-not-allowed',
            error
              ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30 focus:border-red-400'
              : 'border-default',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-card dark:bg-slate-900 text-main dark:text-slate-100">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-card dark:bg-slate-900 text-main dark:text-slate-100 py-2"
            >
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
