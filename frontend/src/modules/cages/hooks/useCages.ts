'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cageService, GetCagesParams } from '../services/cage.service';

export function useCages(initialParams?: GetCagesParams) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(initialParams?.page || 1);
  const [limit, setLimit] = useState(initialParams?.limit || 10);
  const [search, setSearch] = useState(initialParams?.search || '');
  const [type, setType] = useState(initialParams?.type || '');
  const [status, setStatus] = useState(initialParams?.status || '');

  // Query: Fetch Cages
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch: fetchCages,
  } = useQuery({
    queryKey: ['cages', { page, limit, search, type, status }],
    queryFn: () => cageService.getAll({ page, limit, search, type, status }),
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
    cages: data?.cages || [],
    pagination: data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 },
    loading,
    error: queryError ? (queryError as Error).message : null,
    fetchCages,
    deleteCage,
    setPage,
    setLimit,
    setSearch,
    setType,
    setStatus,
    filters: { page, limit, search, type, status }
  };
}
