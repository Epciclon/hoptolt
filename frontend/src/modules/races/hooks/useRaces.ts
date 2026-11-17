import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { raceService, GetRacesParams } from '../services/race.service';


export function useRaces(initialParams?: GetRacesParams) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(initialParams?.page || 1);
  const [limit, setLimit] = useState(initialParams?.limit || 12);
  const [search, setSearch] = useState(initialParams?.search || '');

  // Carga el catálogo completo en memoria y filtra/pagina al instante en frontend
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch: fetchRaces,
  } = useQuery({
    queryKey: ['races', 'all'],
    queryFn: () => raceService.getAll({ page: 1, limit: 1000 }),
    staleTime: 60 * 1000,
  });

  const filteredRaces = useMemo(() => {
    const allRaces = data?.races || [];
    const term = search.trim().toLowerCase();
    if (!term) return allRaces;
    return allRaces.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term)
    );
  }, [data?.races, search]);

  const total = filteredRaces.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedRaces = useMemo(() => {
    const start = (safePage - 1) * limit;
    return filteredRaces.slice(start, start + limit);
  }, [filteredRaces, safePage, limit]);

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
    races: paginatedRaces,
    pagination: { total, page: safePage, limit, totalPages },
    loading,
    error: queryError ? (queryError as Error).message : null,
    fetchRaces,
    deleteRace,
    setPage,
    setLimit,
    setSearch,
    filters: { page: safePage, limit, search }
  };
}
