import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { raceService, GetRacesParams } from '../services/race.service';


export function useRaces(initialParams?: GetRacesParams) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(initialParams?.page || 1);
  const [limit, setLimit] = useState(initialParams?.limit || 10);
  const [search, setSearch] = useState(initialParams?.search || '');

  // Query: Fetch Races
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch: fetchRaces,
  } = useQuery({
    queryKey: ['races', { page, limit, search }],
    queryFn: () => raceService.getAll({ page, limit, search }),
  });

  // Mutation: Delete Race
  const deleteRaceMutation = useMutation({
    mutationFn: (id: number) => raceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['races'] });
    },
  });

  const deleteRace = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await deleteRaceMutation.mutateAsync(id);
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.response?.data?.message || err.message || 'Error al eliminar la raza' };
    }
  };

  return {
    races: data?.races || [],
    pagination: data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 },
    loading,
    error: queryError ? (queryError as Error).message : null,
    fetchRaces,
    deleteRace,
    setPage,
    setLimit,
    setSearch,
    filters: { page, limit, search }
  };
}
