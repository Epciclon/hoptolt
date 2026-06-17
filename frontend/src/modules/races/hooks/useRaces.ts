import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { raceService } from '../services/race.service';
import type { Race } from '../types/race.types';

export function useRaces() {
  const queryClient = useQueryClient();

  // Query: Fetch Races
  const {
    data: races = [],
    isLoading: loading,
    error: queryError,
    refetch: loadRaces,
  } = useQuery({
    queryKey: ['races'],
    queryFn: () => raceService.getAll(),
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
    races,
    loading,
    error: queryError ? (queryError as Error).message : '',
    loadRaces,
    deleteRace,
  };
}
