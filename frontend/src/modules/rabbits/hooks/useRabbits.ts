'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rabbitService, type GetRabbitsParams } from '../services/rabbit.service';


export function useRabbits(initialParams?: GetRabbitsParams) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(initialParams?.page || 1);
  const [limit, setLimit] = useState(initialParams?.limit || 12);
  const [search, setSearch] = useState(initialParams?.search || '');
  const [race, setRace] = useState(initialParams?.race || '');
  const [sex, setSex] = useState(initialParams?.sex || '');
  const [purpose, setPurpose] = useState(initialParams?.purpose || '');

  // Query: Fetch Rabbits
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch: fetchRabbits,
  } = useQuery({
    queryKey: ['rabbits', { page, limit, search, race, sex, purpose }],
    queryFn: () => rabbitService.getAll({ page, limit, search, race, sex, purpose }),
  });

  // Mutation: Delete Rabbit
  const deleteRabbitMutation = useMutation({
    mutationFn: (id: number) => rabbitService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rabbits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['birthCalendar'] });
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
    rabbits: data?.rabbits || [],
    pagination: data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 },
    loading,
    error: queryError ? (queryError as Error).message : null,
    fetchRabbits,
    deleteRabbit,
    setPage,
    setLimit,
    setSearch,
    setRace,
    setSex,
    setPurpose,
    filters: { page, limit, search, race, sex, purpose }
  };
}
