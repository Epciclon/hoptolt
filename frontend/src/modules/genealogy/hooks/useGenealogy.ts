'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { genealogyService } from '../services/genealogy.service';
import type { GenealogyTree } from '../types/genealogy.types';

export function useGenealogy() {
  const queryClient = useQueryClient();

  // Query: Fetch Genealogies
  const {
    data: genealogies = [],
    isLoading: loading,
    error: queryError,
    refetch: fetchGenealogies,
  } = useQuery({
    queryKey: ['genealogies'],
    queryFn: () => genealogyService.getAll(),
  });

  // Mutation: Delete Genealogy
  const deleteGenealogyMutation = useMutation({
    mutationFn: (rabbitId: number) => genealogyService.delete(rabbitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genealogies'] });
    },
  });

  const deleteGenealogy = async (rabbitId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await deleteGenealogyMutation.mutateAsync(rabbitId);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar la genealogía';
      return { success: false, error: message };
    }
  };

  const getTree = async (rabbitId: number, levels?: number): Promise<GenealogyTree | null> => {
    return await genealogyService.getTree(rabbitId, levels);
  };

  // Mutation: Edit Genealogy
  const editGenealogyMutation = useMutation({
    mutationFn: ({ rabbitId, data }: { rabbitId: number; data: { fatherId?: number; motherId?: number } }) =>
      genealogyService.edit(rabbitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genealogies'] });
    },
  });

  const editGenealogy = async (rabbitId: number, data: { fatherId?: number; motherId?: number }): Promise<boolean> => {
    await editGenealogyMutation.mutateAsync({ rabbitId, data });
    return true;
  };

  return {
    genealogies,
    loading,
    error: queryError ? (queryError as Error).message : null,
    fetchGenealogies,
    deleteGenealogy,
    getTree,
    editGenealogy,
  };
}
