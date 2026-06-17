'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dewormingService } from '../services/deworming.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import type { Deworming } from '../types/deworming.types';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export function useDeworming() {
  const queryClient = useQueryClient();

  // Query: Fetch Dewormings
  const {
    data: dewormings = [],
    isLoading: loadingDewormings,
    error: errorDewormings,
    refetch: fetchDewormings,
  } = useQuery({
    queryKey: ['dewormings'],
    queryFn: () => dewormingService.getAll(),
  });

  // Query: Fetch Assigned Rabbits
  const {
    data: assignedRabbits = [],
    isLoading: loadingRabbits,
    error: errorRabbits,
  } = useQuery({
    queryKey: ['assignedRabbits'],
    queryFn: () => assignmentService.getAssignedRabbits(),
  });

  // Query: Fetch Deworming Period
  const {
    data: dewormingPeriodData,
    isLoading: loadingPeriod,
  } = useQuery({
    queryKey: ['dewormingPeriod'],
    queryFn: () => dewormingService.getGalponDewormingPeriod(),
  });

  const dewormingPeriod = dewormingPeriodData ?? 30;

  const loading = loadingDewormings || loadingRabbits || loadingPeriod;
  const error = errorDewormings ? (errorDewormings as Error).message : (errorRabbits ? (errorRabbits as Error).message : null);

  // Mutation: Create Deworming
  const createDewormingMutation = useMutation({
    mutationFn: (payload: { rabbitIds: number[] }) => dewormingService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dewormings'] });
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
    fetchDewormings,
    createDeworming 
  };
}
