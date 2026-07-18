'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reproductionService } from '../services/reproduction.service';


export function useReproduction(filters?: { profileId?: string; date?: string; status?: string | null }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [status, setStatus] = useState<string | null>(filters?.status || null);

  // Query: Fetch Reproductions
  const {
    data: reproductionsData,
    isLoading: loadingReproductions,
    error: errorReproductions,
    refetch: fetchReproductions,
  } = useQuery({
    queryKey: ['reproductions', page, limit, status, filters?.profileId, filters?.date],
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
        startDate, 
        endDate 
      });
    },
    refetchInterval: 15000,
  });

  // Query: Fetch Females
  const {
    data: reproductionFemales = [],
    isLoading: loadingFemales,
  } = useQuery({
    queryKey: ['reproductionFemales'],
    queryFn: () => reproductionService.getReproductionFemales(),
  });

  // Query: Fetch Males
  const {
    data: reproductionMales = [],
    isLoading: loadingMales,
  } = useQuery({
    queryKey: ['reproductionMales'],
    queryFn: () => reproductionService.getReproductionMales(),
  });

  const loading = loadingReproductions || loadingFemales || loadingMales;
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

  const createReproduction = async (payload: { femaleId: number; mountDate: string }) => {
    return createReproductionMutation.mutateAsync(payload);
  };

  const updateReproduction = async (id: number, payload: { maleId?: number; mountDate: string }) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproductions'] });
      queryClient.invalidateQueries({ queryKey: ['birthCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['active-dates'] });
    },
  });

  const cancelReproductionMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'delete' | 'fail'; reason?: string }) => reproductionService.cancelReproduction(id, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproductions'] });
      queryClient.invalidateQueries({ queryKey: ['birthCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['active-dates'] });
    },
  });

  const finishLactationMutation = useMutation({
    mutationFn: (id: number) => reproductionService.finishLactation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproductions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['active-dates'] });
    },
  });

  const registerBirth = async (id: number, payload: { bornKits?: number; actualBirthDate?: string }) => registerBirthMutation.mutateAsync({ id, payload });
  const cancelReproduction = async (id: number, action: 'delete' | 'fail', reason?: string) => cancelReproductionMutation.mutateAsync({ id, action, reason });
  const finishLactation = async (id: number) => finishLactationMutation.mutateAsync(id);

  return {
    reproductions: reproductionsData?.reproductions || [],
    pagination: reproductionsData?.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 },
    reproductionFemales,
    reproductionMales,
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
  };
}
