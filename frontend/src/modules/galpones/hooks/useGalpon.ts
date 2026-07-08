'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { galponService } from '../services/galpon.service';

export function useGalpon() {
  const queryClient = useQueryClient();

  // Query: Fetch Galpones
  const {
    data: galpones = [],
    isLoading: loading,
    error: queryError,
    refetch: fetchGalpones,
  } = useQuery({
    queryKey: ['galpones'],
    queryFn: () => galponService.getAll(),
  });

  // Mutation: Delete Galpon
  const deleteGalponMutation = useMutation({
    mutationFn: (id: number) => galponService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galpones'] });
    },
  });

  const deleteGalpon = async (id: number): Promise<boolean> => {
    try {
      await deleteGalponMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  return {
    galpones,
    loading,
    error: queryError ? (queryError as Error).message : null,
    fetchGalpones,
    deleteGalpon,
  };
}
