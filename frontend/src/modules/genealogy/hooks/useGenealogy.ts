'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { genealogyService } from '../services/genealogy.service';
import type { Genealogy, GenealogyTree } from '../types/genealogy.types';

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
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al eliminar la genealogía' };
    }
  };

  const getTree = async (rabbitId: number, levels?: number): Promise<GenealogyTree | null> => {
    try {
      return await genealogyService.getTree(rabbitId, levels);
    } catch (err) {
      return null;
    }
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
    try {
      await editGenealogyMutation.mutateAsync({ rabbitId, data });
      return true;
    } catch (err) {
      return false;
    }
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
