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
}: Readonly<CageGroupCardProps>) {
  const isSelectable = !!onCageClick;

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
          Jaula #{cageNumber}
        </h3>
        {headerBadge && (
          <div className="absolute right-0 top-0 pointer-events-auto">
            {headerBadge}
          </div>
        )}
        <span className="px-2.5 py-0.5 bg-theme-surface border border-default text-main rounded-full text-[11px] font-medium capitalize border border-strong max-w-[120px] truncate">
          {cageType}
        </span>
      </div>

      <div className="flex-1 space-y-3 relative z-10 pointer-events-auto">
        {children}
      </div>

      {footer && (
        <div className="mt-4 pt-3 border-t border-default relative z-10 pointer-events-auto">
          {footer}
        </div>
      )}
    </div>
  );
}
