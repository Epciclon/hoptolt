import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';
import { X } from 'lucide-react';
import { RabbitAvatar } from './RabbitAvatar';

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
      className={cn(
        'border rounded-lg p-3 transition-all duration-150 bg-card text-left w-full block relative',
        isSelectable && 'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-1 pointer-events-auto',
        (() => {
          if (isSelected) return 'border-primary-500 ring-1 ring-primary-500 shadow-sm';
          if (isSelectable) return 'border-slate-300 shadow-sm hover:border-primary-400';
          return 'border-slate-300 shadow-sm';
        })()
      )}
    >
      {isSelectable && (
        <button
          type="button"
          onClick={onClick}
          className="absolute inset-0 z-0 w-full h-full cursor-pointer focus:outline-none pointer-events-auto"
          aria-label="Seleccionar conejo"
        />
      )}

      <div className="flex justify-between items-start mb-2 gap-2 pointer-events-none">
        <div className="flex items-center gap-3 relative z-0 min-w-0 flex-1">
          <RabbitAvatar imageUrl={rabbit.imageUrl} alt={rabbit.code} size="md" />
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
              className="pointer-events-auto text-theme-faint hover:text-muted hover:bg-theme-surface border border-default rounded-full p-1 transition-colors -mt-1 -mr-1 relative z-20"
              title="Quitar"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {(rabbit.age !== undefined || rabbit.weight !== undefined) && (
        <div className="flex justify-between text-xs text-muted px-1 relative z-0 pointer-events-none">
          <span>{rabbit.age !== undefined ? <><span className="font-medium text-main">{rabbit.age}</span> {rabbit.age === 1 ? 'mes' : 'meses'}</> : null}</span>
          <span>{rabbit.weight !== undefined ? <><span className="font-medium text-main">{rabbit.weight}</span> kg</> : null}</span>
        </div>
      )}

      {isSelected && extras && (
        <div className="pt-2 border-t border-strong/60 mt-2 relative z-10 pointer-events-none [&_button]:pointer-events-auto [&_a]:pointer-events-auto">
          {extras}
        </div>
      )}

      {children && (
        <div className="mt-3 border-t border-default pt-3 relative z-20 pointer-events-none [&_button]:pointer-events-auto [&_a]:pointer-events-auto [&_input]:pointer-events-auto [&_select]:pointer-events-auto">
          {children}
        </div>
      )}
    </div>
  );
}
