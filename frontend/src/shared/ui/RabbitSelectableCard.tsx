import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';
import { X } from 'lucide-react';

interface RabbitSelectableCardProps {
  rabbit: AssignedRabbit;
  isSelected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  extras?: ReactNode; // Extra content when selected, e.g. "Última vacunación"
  children?: ReactNode; // Content that ALWAYS renders below the rabbit info
}

export function RabbitSelectableCard({
  rabbit,
  isSelected = false,
  onClick,
  onRemove,
  extras,
  children
}: Readonly<RabbitSelectableCardProps>) {
  const isSelectable = !!onClick;

  return (
    <div
      onClick={isSelectable ? onClick : undefined}
      role={isSelectable ? "button" : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      className={cn(
        'border rounded-lg p-3 transition-all duration-150 bg-card text-left w-full block relative',
        isSelectable && 'cursor-pointer focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-1',
        (() => {
          if (isSelected) return 'border-primary-500 ring-1 ring-primary-500 shadow-sm';
          if (isSelectable) return 'border-slate-300 shadow-sm hover:border-primary-400';
          return 'border-slate-300 shadow-sm';
        })()
      )}
      onKeyDown={(e) => {
        if (isSelectable && onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >

      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex items-center gap-3 relative z-0 min-w-0 flex-1">
          {rabbit.imageUrl ? (
            <img src={rabbit.imageUrl} alt={rabbit.code} className="w-10 h-10 flex-shrink-0 rounded-full object-cover shadow-sm border border-strong" />
          ) : (
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-theme-surface border border-default flex items-center justify-center text-theme-faint border border-strong text-[9px] text-center leading-tight px-1">
              Sin foto
            </div>
          )}
          <div className="min-w-0">
            {rabbit.name ? (
              <>
                <h4 className="font-bold text-sm text-main leading-tight">{rabbit.name}</h4>
                <p className="text-xs text-muted">{rabbit.code}</p>
              </>
            ) : (
              <h4 className="font-bold text-sm text-main leading-tight">{rabbit.code}</h4>
            )}
          </div>
        </div>
        <div className="flex items-start gap-1 flex-shrink-0">
          {rabbit.race && (
            <span className="px-2 py-0.5 bg-theme-surface text-muted text-[10px] font-medium rounded-full capitalize border border-strong" title={rabbit.race}>
              {rabbit.race}
            </span>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="text-theme-faint hover:text-muted hover:bg-theme-surface border border-default rounded-full p-1 transition-colors -mt-1 -mr-1 relative z-20"
              title="Quitar"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {(rabbit.age !== undefined || rabbit.weight !== undefined) && (
        <div className="flex justify-between text-xs text-muted px-1 relative z-0">
          <span>{rabbit.age !== undefined ? <><span className="font-medium text-main">{rabbit.age}</span> {rabbit.age === 1 ? 'mes' : 'meses'}</> : null}</span>
          <span>{rabbit.weight !== undefined ? <><span className="font-medium text-main">{rabbit.weight}</span> kg</> : null}</span>
        </div>
      )}

      {isSelected && extras && (
        <div className="pt-2 border-t border-strong/60 mt-2 relative z-20">
          {extras}
        </div>
      )}

      {children && (
        <div className="mt-3 border-t border-default pt-3 relative z-20">
          {children}
        </div>
      )}
    </div>
  );
}
