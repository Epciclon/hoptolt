'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rabbitService } from '../services/rabbit.service';
import type { Rabbit } from '../types/rabbit.types';

export function useRabbits() {
  const queryClient = useQueryClient();

  // Query: Fetch Rabbits
  const {
    data: rabbits = [],
    isLoading: loading,
    error: queryError,
    refetch: fetchRabbits,
  } = useQuery({
    queryKey: ['rabbits'],
    queryFn: () => rabbitService.getAll(),
  });

  // Mutation: Delete Rabbit
  const deleteRabbitMutation = useMutation({
    mutationFn: (id: number) => rabbitService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rabbits'] });
    },
  });

  const deleteRabbit = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await deleteRabbitMutation.mutateAsync(id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al eliminar el conejo' };
    }
  };

  return {
    rabbits,
    loading,
    error: queryError ? (queryError as Error).message : null,
    fetchRabbits,
    deleteRabbit,
  };
}
