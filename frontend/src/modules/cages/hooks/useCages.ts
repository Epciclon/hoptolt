'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cageService, GetCagesParams } from '../services/cage.service';

export function useCages(initialParams?: GetCagesParams) {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(initialParams?.page || 1);
  const [limit, setLimit] = useState(initialParams?.limit || 12);
  const [search, setSearch] = useState(initialParams?.search || '');
  const [type, setType] = useState(initialParams?.type || '');
  const [status, setStatus] = useState(initialParams?.status || '');

  // Carga las jaulas del galpón y filtra/pagina al instante en frontend
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch: fetchCages,
  } = useQuery({
    queryKey: ['cages', 'all'],
    queryFn: () => cageService.getAll({ page: 1, limit: 1000 }),
    staleTime: 60 * 1000,
  });

  const filteredCages = useMemo(() => {
    const allCages = data?.cages || [];
    const term = search.trim().toLowerCase().replace(/^jaula\s*/i, '');
    return allCages.filter((c) => {
      if (type && c.type !== type) return false;
      if (status && c.status !== status) return false;
      if (!term) return true;
      return String(c.number).toLowerCase().includes(term);
    });
  }, [data?.cages, search, type, status]);

  const total = filteredCages.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedCages = useMemo(() => {
    const start = (safePage - 1) * limit;
    return filteredCages.slice(start, start + limit);
  }, [filteredCages, safePage, limit]);

  // Mutation: Delete Cage
  const deleteCageMutation = useMutation({
    mutationFn: (id: number) => cageService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cages'] });
      queryClient.invalidateQueries({ queryKey: ['operativeCages'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignedRabbits'] });
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
    cages: paginatedCages,
    pagination: { total, page: safePage, limit, totalPages },
    loading,
    error: queryError ? (queryError as Error).message : null,
    fetchCages,
    deleteCage,
    setPage,
    setLimit,
    setSearch,
    setType,
    setStatus,
    filters: { page: safePage, limit, search, type, status }
  };
}
