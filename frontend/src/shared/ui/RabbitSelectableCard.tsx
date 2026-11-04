'use client';

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
        'border rounded-lg p-2.5 sm:p-3 transition-all duration-150 bg-card text-left w-full min-w-0 block relative',
        isSelectable && 'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-1 pointer-events-auto',
        (() => {
          if (isSelected) return 'border-primary-500 ring-1 ring-primary-500 shadow-sm';
          if (isSelectable) return 'border-strong shadow-sm hover:border-primary-400';
          return 'border-strong shadow-sm';
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

      {/* Disposición centrada vertical estándar de móvil aplicada a todas las pantallas */}
      <div className="flex flex-col items-center gap-2.5 mb-2 relative z-0 min-w-0 pointer-events-none">
        <div className="shrink-0 mb-1">
          <RabbitAvatar imageUrl={rabbit.imageUrl} alt={rabbit.code} size="md" />
        </div>
        <div className="min-w-0 flex-1 w-full">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              {rabbit.name ? (
                <>
                  <h4 className="font-bold text-sm text-main leading-tight truncate" title={rabbit.name}>
                    {rabbit.name}
                  </h4>
                  <p className="text-xs text-muted leading-tight mt-0.5 truncate font-medium">
                    {rabbit.code}
                  </p>
                </>
              ) : (
                <h4 className="font-bold text-sm text-main leading-tight truncate" title={rabbit.code}>
                  {rabbit.code}
                </h4>
              )}
            </div>
            {rabbit.race && (
              <span className="px-2 py-0.5 bg-theme-surface text-muted text-xs font-medium rounded-full capitalize border border-strong shrink-0 whitespace-nowrap" title={rabbit.race}>
                {rabbit.race}
              </span>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="pointer-events-auto text-theme-faint hover:text-muted hover:bg-theme-surface border border-default rounded-full p-1 transition-colors -mt-1 -mr-1 shrink-0"
                title="Quitar"
              >
                <X size={14} />
              </button>
            )}
          </div>
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
