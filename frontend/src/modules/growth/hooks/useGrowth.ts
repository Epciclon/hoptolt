'use client';

import { useQuery } from '@tanstack/react-query';
import { growthService } from '../services/growth.service';
import type { Growth } from '../types/growth.types';

/**
 * Hook para gestionar el historial de crecimiento de un conejo.
 * Sigue la arquitectura estándar de módulos de la aplicación.
 */
export function useGrowthHistory(rabbitId: number) {
  const {
    data: growths = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<Growth[]>({
    queryKey: ['growths', rabbitId],
    queryFn: () => growthService.getHistory(rabbitId),
    enabled: !!rabbitId,
  });

  const error = queryError ? (queryError as Error).message : '';

  return {
    growths,
    loading,
    error,
    refetch,
  };
}
