'use client';

import { useQuery } from '@tanstack/react-query';
import { reproductionService } from '@/modules/reproduction/services/reproduction.service';

export function RabbitReproductionStats({ rabbitId }: Readonly<{ rabbitId: number }>) {
  const { data: reproductions = [] } = useQuery({
    queryKey: ['reproductions', 'female', rabbitId],
    queryFn: () => reproductionService.getByFemaleId(rabbitId),
    enabled: !!rabbitId,
  });

  const completedCount = reproductions.filter(r => r.status === 'completado').length;
  const failedCount = reproductions.filter(r => r.status === 'fallido').length;

  // Si no hay historial concluido, no mostramos nada
  if (completedCount === 0 && failedCount === 0) return null;

  return (
    <div className="flex items-start justify-between gap-2 sm:gap-3 border-t border-default/50 pt-2">
      <span className="text-muted">Partos:</span>
      <div className="flex flex-col items-end text-right gap-0.5 shrink-0 font-semibold text-xs sm:text-sm">
        <span className="text-main whitespace-nowrap">
          {completedCount} Exitoso{completedCount === 1 ? '' : 's'}
        </span>
        {failedCount > 0 && (
          <span className="text-amber-600 dark:text-amber-400 whitespace-nowrap">
            {failedCount} Fallo{failedCount === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </div>
  );
}
