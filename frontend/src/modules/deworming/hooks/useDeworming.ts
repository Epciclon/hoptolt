'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dewormingService } from '../services/deworming.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';


export function useDeworming(filters?: { profileId?: string; date?: string }) {
  const queryClient = useQueryClient();
  const { activeGalpon } = useActiveGalpon();
  const galponId = activeGalpon?.id || 'none';

  // Query: Fetch Deworming Types
  const {
    data: galponDewormingTypes = [],
    isLoading: loadingDewormingTypes,
    error: errorDewormingTypes,
  } = useQuery({
    queryKey: ['galponDewormingTypes', galponId],
    queryFn: () => dewormingService.getTypes(),
  });

  // Query: Fetch Dewormings
  const {
    data: dewormings = [],
    isLoading: loadingDewormings,
    error: errorDewormings,
    refetch: fetchDewormings,
  } = useQuery({
    queryKey: ['dewormings', galponId, filters?.profileId, filters?.date],
    queryFn: () => {
      let startDate, endDate;
      if (filters?.date) {
        startDate = `${filters.date}T00:00:00-05:00`;
        endDate = `${filters.date}T23:59:59-05:00`;
      }
      return dewormingService.getAll({ profileId: filters?.profileId, startDate, endDate });
    },
  });

  // Query: Fetch Assigned Rabbits
  const {
    data: assignedRabbits = [],
    isLoading: loadingRabbits,
    error: errorRabbits,
  } = useQuery({
    queryKey: ['assignedRabbits', galponId],
    queryFn: () => assignmentService.getAssignedRabbits(),
  });

  // Query: Fetch Deworming Period
  const {
    data: dewormingPeriodData,
    isLoading: loadingPeriod,
  } = useQuery({
    queryKey: ['dewormingPeriod', galponId],
    queryFn: () => dewormingService.getGalponDewormingPeriod(),
  });

  const dewormingPeriod = dewormingPeriodData ?? 30;

  const loading = loadingDewormings || loadingRabbits || loadingPeriod;
  let errorStr = null;
  if (errorDewormings) {
    errorStr = (errorDewormings as Error).message;
  } else if (errorRabbits) {
    errorStr = (errorRabbits as Error).message;
  }
  const error = errorStr;

  // Mutation: Create Deworming
  const createDewormingMutation = useMutation({
    mutationFn: (payload: { rabbitIds: number[] }) => dewormingService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dewormings'] });
      queryClient.invalidateQueries({ queryKey: ['active-dates'] });
    },
  });

  const createDeworming = async (payload: { rabbitIds: number[] }) => {
    return createDewormingMutation.mutateAsync(payload);
  };

  return {
    dewormings,
    assignedRabbits,
    dewormingPeriod,
    loading,
    error,
    createDeworming,
    isCreating: createDewormingMutation.isPending,
    fetchDewormings,
  };
}
