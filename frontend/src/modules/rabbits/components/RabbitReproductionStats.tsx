'use client';

import { useQuery } from '@tanstack/react-query';
import { reproductionService } from '@/modules/reproduction/services/reproduction.service';

export function RabbitReproductionStats({ rabbitId }: { rabbitId: number }) {
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
    <div className="flex items-center justify-between gap-2 sm:gap-3 border-t border-default/50 pt-2">
      <span className="text-muted">Partos:</span>
      <span className="font-semibold text-main flex items-center gap-1.5 text-xs sm:text-sm">
        <span>{completedCount} Exitoso{completedCount !== 1 ? 's' : ''}</span>
        {failedCount > 0 && (
          <>
            <span className="text-slate-300">|</span>
            <span>{failedCount} Fallo{failedCount !== 1 ? 's' : ''} {failedCount >= 2 && '⚠️'}</span>
          </>
        )}
      </span>
    </div>
  );
}
