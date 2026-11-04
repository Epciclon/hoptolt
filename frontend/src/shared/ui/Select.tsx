'use client';

import { useState, useRef, useEffect, SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
}

export const Select = forwardRef<HTMLSelectElement, Readonly<SelectProps>>(
  ({ label, error, hint, options, placeholder, className, id, required, value = '', onChange, name, disabled, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    const selectedOption = options.find((opt) => opt.value === value);
    const displayLabel = selectedOption
      ? selectedOption.label
      : placeholder || (options[0] ? options[0].label : 'Seleccionar...');

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false);
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen]);

    const handleSelectOption = (optValue: string) => {
      onChange?.({ target: { value: optValue, name } });
      setIsOpen(false);
    };

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-main">
            {label}
            {required && <span className="text-muted ml-0.5">*</span>}
          </label>
        )}

        <div ref={containerRef} className="relative w-full">
          {/* Native select oculto para soporte de ref y formularios */}
          <select
            ref={ref}
            id={selectId}
            name={name}
            value={value}
            required={required}
            disabled={disabled}
            onChange={(e) => onChange?.({ target: { value: e.target.value, name } })}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            {...props}
          >
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Botón disparador visible */}
          <button
            type="button"
            id={selectId ? `${selectId}-trigger` : undefined}
            disabled={disabled}
            onClick={() => setIsOpen((prev) => !prev)}
            className={cn(
              'w-full pl-3 pr-9 py-2 text-sm rounded-lg border bg-theme-surface dark:bg-slate-900 border-default text-main dark:text-slate-100 text-left',
              'transition-all duration-200 cursor-pointer flex items-center justify-between',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'disabled:bg-theme-surface dark:disabled:bg-slate-800 disabled:text-theme-faint disabled:cursor-not-allowed',
              isOpen && 'ring-2 ring-primary-500 border-primary-500',
              error
                ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30 focus:border-red-400'
                : 'border-default',
              className,
            )}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className="truncate block font-medium">
              {displayLabel}
            </span>
            <ChevronDown
              size={16}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none transition-transform duration-200',
                isOpen && 'rotate-180 text-primary-500'
              )}
            />
          </button>

          {/* Menú desplegable personalizado con scroll limitado */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-1 w-full min-w-full bg-card border border-strong rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="max-h-44 sm:max-h-52 overflow-y-auto divide-y divide-default/40 py-1 overscroll-contain">
                {placeholder && (
                  <button
                    type="button"
                    disabled
                    className="w-full text-left px-3 py-2 text-xs font-medium text-theme-faint cursor-not-allowed bg-theme-surface/50"
                  >
                    {placeholder}
                  </button>
                )}
                {options.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectOption(opt.value)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs sm:text-sm transition-colors flex items-center justify-between gap-2 cursor-pointer',
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/25 text-primary-600 dark:text-primary-400 font-semibold'
                          : 'text-main hover:bg-theme-surface'
                      )}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <Check size={14} className="text-primary-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
