'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reproductionService } from '../services/reproduction.service';
import type { Reproduction, ReproductionFemale, ReproductionMale } from '../types/reproduction.types';

export function useReproduction() {
  const queryClient = useQueryClient();

  // Query: Fetch Reproductions
  const {
    data: reproductions = [],
    isLoading: loadingReproductions,
    error: errorReproductions,
    refetch: fetchReproductions,
  } = useQuery({
    queryKey: ['reproductions'],
    queryFn: () => reproductionService.getAll(),
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
    },
  });

  // Mutation: Update
  const updateReproductionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { maleId?: number; mountDate: string } }) =>
      reproductionService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproductions'] });
      queryClient.invalidateQueries({ queryKey: ['birthCalendar'] });
    },
  });

  // Mutation: Delete
  const deleteReproductionMutation = useMutation({
    mutationFn: (id: number) => reproductionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproductions'] });
      queryClient.invalidateQueries({ queryKey: ['birthCalendar'] });
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
      return false;
    }
  };

  return {
    reproductions,
    reproductionFemales,
    reproductionMales,
    loading,
    error,
    fetchReproductions,
    createReproduction,
    updateReproduction,
    deleteReproduction,
  };
}
