'use client';

import { ReactNode, useState, Children } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CageGroupCardProps {
  cageNumber: number;
  cageType: string;
  isSelected?: boolean;
  onCageClick?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  headerBadge?: ReactNode;
}

export function CageGroupCard({
  cageNumber,
  cageType,
  isSelected = false,
  onCageClick,
  children,
  footer,
  headerBadge
}: Readonly<CageGroupCardProps>) {
  const isSelectable = !!onCageClick;
  const [expanded, setExpanded] = useState(false);
  
  const childrenArray = Children.toArray(children);
  const hasManyChildren = childrenArray.length > 3;
  const visibleChildren = expanded ? childrenArray : childrenArray.slice(0, 3);

  return (
    <div
      className={cn(
        'group relative border shadow-sm rounded-xl p-4 transition-all duration-150 flex flex-col text-left w-full',
        (() => {
          if (isSelected) return 'border-primary-500 ring-1 ring-primary-500 bg-card shadow-sm';
          if (isSelectable) return 'border-slate-300 bg-card hover:border-primary-400';
          return 'border-slate-300 bg-card hover:shadow-md';
        })()
      )}
    >
      {/* Invisible button for full-card click accessibility without nested buttons */}
      {isSelectable && onCageClick && (
        <button
          type="button"
          onClick={onCageClick}
          className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset rounded-xl"
          aria-label={`Seleccionar jaula ${cageNumber}`}
        />
      )}

      <div className="flex flex-col items-center justify-center mb-4 border-b border-strong pb-3 relative z-10 pointer-events-none">
        <h3 className="text-lg font-bold text-main text-center mb-1">
          Jaula {cageNumber}
        </h3>
        {headerBadge && (
          <div className="absolute right-0 top-0 pointer-events-none">
            {headerBadge}
          </div>
        )}
        <span className="px-2.5 py-0.5 bg-theme-surface border border-default text-main rounded-full text-[11px] font-medium capitalize border border-strong max-w-[120px] truncate">
          {cageType}
        </span>
      </div>

      <div className={cn("flex-1 space-y-3 relative z-10", isSelectable ? "pointer-events-none" : "pointer-events-auto")}>
        {visibleChildren}
      </div>

      {hasManyChildren && (
        <div className="mt-2 flex justify-center relative z-20 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex items-center gap-1 text-xs font-medium text-muted hover:text-main bg-theme-surface border border-default rounded-full px-3 py-1.5 shadow-sm transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp size={14} /> Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Ver {childrenArray.length - 3} más
              </>
            )}
          </button>
        </div>
      )}

      {footer && (
        <div className={cn("mt-4 pt-3 border-t border-default relative z-20", isSelectable ? "pointer-events-none" : "pointer-events-auto")}>
          {footer}
        </div>
      )}
    </div>
  );
}
