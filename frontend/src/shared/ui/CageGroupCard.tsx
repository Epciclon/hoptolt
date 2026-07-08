import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
}: CageGroupCardProps) {
  const isSelectable = !!onCageClick;

  return (
    <div
      role={isSelectable ? "button" : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      onClick={isSelectable ? onCageClick : undefined}
      onKeyDown={(e) => {
        if (isSelectable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onCageClick?.();
        }
      }}
      className={cn(
        'border shadow-sm rounded-xl p-4 transition-all duration-150 flex flex-col',
        isSelectable ? 'cursor-pointer' : '',
        isSelected
          ? 'border-primary-500 ring-1 ring-primary-500 bg-white shadow-sm'
          : isSelectable
            ? 'border-slate-300 bg-white hover:border-primary-400'
            : 'border-slate-300 bg-white hover:shadow-md'
      )}
    >
      <div className="flex flex-col items-center justify-center mb-4 border-b border-slate-200 pb-3 relative">
        <h3 className="text-lg font-bold text-slate-800 text-center mb-1">
          Jaula #{cageNumber}
        </h3>
        {headerBadge && (
          <div className="absolute right-0 top-0">
            {headerBadge}
          </div>
        )}
        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[11px] font-medium capitalize border border-slate-200">
          {cageType}
        </span>
      </div>

      <div className="flex-1 space-y-3">
        {children}
      </div>

      {footer && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          {footer}
        </div>
      )}
    </div>
  );
}
