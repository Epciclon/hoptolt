'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cageService } from '../services/cage.service';
import type { Cage } from '../types/cage.types';

export function useCages() {
  const queryClient = useQueryClient();

  // Query: Fetch Cages
  const {
    data: cages = [],
    isLoading: loading,
    error: queryError,
    refetch: fetchCages,
  } = useQuery({
    queryKey: ['cages'],
    queryFn: () => cageService.getAll(),
  });

  // Mutation: Delete Cage
  const deleteCageMutation = useMutation({
    mutationFn: (id: number) => cageService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cages'] });
    },
  });

  const deleteCage = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await deleteCageMutation.mutateAsync(id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al eliminar la jaula' };
    }
  };

  return {
    cages,
    loading,
    error: queryError ? (queryError as Error).message : null,
    fetchCages,
    deleteCage,
  };
}
