'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { galponService } from '../services/galpon.service';
import type { CreateGalponDto, UpdateGalponDto } from '../types/galpon.types';

export function useGalpones() {
  const queryClient = useQueryClient();

  const { data: galpones = [], isLoading: loading, error: queryError, refetch: fetchGalpones } = useQuery({
    queryKey: ['galpones'],
    queryFn: () => galponService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateGalponDto) => galponService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galpones'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateGalponDto }) => galponService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galpones'] });
      queryClient.invalidateQueries({ queryKey: ['activeGalpon'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => galponService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galpones'] });
      queryClient.invalidateQueries({ queryKey: ['activeGalpon'] });
    },
  });

  const error = queryError ? (queryError as Error).message : null;

  return {
    galpones,
    loading,
    error,
    refetch: fetchGalpones,
    createGalpon: (payload: CreateGalponDto) => createMutation.mutateAsync(payload),
    updateGalpon: (id: number, payload: UpdateGalponDto) => updateMutation.mutateAsync({ id, payload }),
    deleteGalpon: (id: number) => deleteMutation.mutateAsync(id),
  };
}
