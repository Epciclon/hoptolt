'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { reproductionService } from '../services/reproduction.service';
import type { Reproduction } from '../types/reproduction.types';

function removeReproductionFromCaches(
  queryClient: QueryClient,
  id: number,
  statusesToUpdate: string[]
) {
  const queries = queryClient.getQueriesData<any>({ queryKey: ['reproductions'] });
  for (const [key, data] of queries) {
    if (!data?.reproductions || !Array.isArray(data.reproductions)) continue;
    const keyStatus = Array.isArray(key) ? key[3] : null;
    if (keyStatus && statusesToUpdate.includes(String(keyStatus))) {
      queryClient.setQueryData(key, {
        ...data,
        reproductions: data.reproductions.filter((r: Reproduction) => r.id !== id),
      });
    }
  }
}

function patchReproductionInCaches(
  queryClient: QueryClient,
  id: number,
  patch: Partial<Reproduction>
) {
  const queries = queryClient.getQueriesData<any>({ queryKey: ['reproductions'] });
  for (const [key, data] of queries) {
    if (!data?.reproductions || !Array.isArray(data.reproductions)) continue;
    const hasItem = data.reproductions.some((r: Reproduction) => r.id === id);
    if (hasItem) {
      queryClient.setQueryData(key, {
        ...data,
        reproductions: data.reproductions.map((r: Reproduction) =>
          r.id === id ? { ...r, ...patch } : r
        ),
      });
    }
  }
}


export function useReproduction(filters?: { profileId?: string; date?: string; status?: string | null; search?: string; limit?: number; enabled?: boolean }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(filters?.limit || 12);
  const [status, setStatus] = useState<string | null>(filters?.status || null);
  const [search, setSearch] = useState<string>(filters?.search || '');
  const isEnabled = filters?.enabled !== false;

  // Query: Fetch Reproductions
  const {
    data: reproductionsData,
    isLoading: loadingReproductions,
    error: errorReproductions,
    refetch: fetchReproductions,
  } = useQuery({
    queryKey: ['reproductions', page, limit, status, search, filters?.profileId, filters?.date],
    queryFn: () => {
      let startDate, endDate;
      if (filters?.date) {
        startDate = `${filters.date}T00:00:00-05:00`;
        endDate = `${filters.date}T23:59:59-05:00`;
      }
      return reproductionService.getAll({ 
        page, 
        limit, 
        status, 
        profileId: filters?.profileId, 
        search,
        startDate, 
        endDate 
      });
    },
    enabled: isEnabled,
    refetchInterval: isEnabled ? 15000 : false,
  });

  const loading = isEnabled && loadingReproductions;
  const error = errorReproductions ? (errorReproductions as Error).message : null;

  // Mutation: Create
  const createReproductionMutation = useMutation({
    mutationFn: (payload: { femaleId: number; mountDate: string }) => reproductionService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproductions'] });
      queryClient.invalidateQueries({ queryKey: ['birthCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['active-dates'] });
    },
  });

  // Mutation: Update
  const updateReproductionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { maleId?: number; mountDate: string } }) =>
      reproductionService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproductions'] });
      queryClient.invalidateQueries({ queryKey: ['birthCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['active-dates'] });
    },
  });

  // Mutation: Delete
  const deleteReproductionMutation = useMutation({
    mutationFn: (id: number) => reproductionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproductions'] });
      queryClient.invalidateQueries({ queryKey: ['birthCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['active-dates'] });
    },
  });

  const createReproduction = (payload: { femaleId: number; mountDate: string }) => {
    return createReproductionMutation.mutateAsync(payload);
  };

  const updateReproduction = (id: number, payload: { maleId?: number; mountDate: string }) => {
    return updateReproductionMutation.mutateAsync({ id, payload });
  };

  const deleteReproduction = async (id: number): Promise<boolean> => {
    try {
      await deleteReproductionMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error('Error deleting reproduction:', err);
      return false;
    }
  };

  const registerBirthMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { bornKits?: number; actualBirthDate?: string } }) => reproductionService.registerBirth(id, payload),
    onSuccess: (updatedRep, variables) => {
      if (variables.payload.actualBirthDate) {
        removeReproductionFromCaches(queryClient, variables.id, ['gestacion']);
      } else if (variables.payload.bornKits !== undefined) {
        patchReproductionInCaches(queryClient, variables.id, {
          bornKits: variables.payload.bornKits,
          ...(updatedRep || {}),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['reproductions'] });
      queryClient.invalidateQueries({ queryKey: ['birthCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['active-dates'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const cancelReproductionMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'delete' | 'fail'; reason?: string }) => reproductionService.cancelReproduction(id, action, reason),
    onSuccess: (_res, variables) => {
      removeReproductionFromCaches(queryClient, variables.id, ['monta', 'gestacion', 'lactancia']);
      queryClient.invalidateQueries({ queryKey: ['reproductions'] });
      queryClient.invalidateQueries({ queryKey: ['birthCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['active-dates'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const finishLactationMutation = useMutation({
    mutationFn: (id: number) => reproductionService.finishLactation(id),
    onSuccess: (_res, id) => {
      removeReproductionFromCaches(queryClient, id, ['lactancia']);
      queryClient.invalidateQueries({ queryKey: ['reproductions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['active-dates'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const registerBirth = (id: number, payload: { bornKits?: number; actualBirthDate?: string }) => registerBirthMutation.mutateAsync({ id, payload });
  const cancelReproduction = (id: number, action: 'delete' | 'fail', reason?: string) => cancelReproductionMutation.mutateAsync({ id, action, reason });
  const finishLactation = (id: number) => finishLactationMutation.mutateAsync(id);

  return {
    reproductions: reproductionsData?.reproductions || [],
    pagination: reproductionsData?.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 },
    loading,
    error,
    fetchReproductions,
    createReproduction,
    updateReproduction,
    deleteReproduction,
    registerBirth,
    cancelReproduction,
    finishLactation,
    setPage,
    setLimit,
    setStatus,
    setSearch,
  };
}
