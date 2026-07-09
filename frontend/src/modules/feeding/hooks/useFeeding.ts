'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedingService } from '../services/feeding.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export function useFeeding(filters?: { profileId?: string; date?: string }) {
  const queryClient = useQueryClient();
  const { activeGalpon } = useActiveGalpon();

  // Query: Fetch Feedings
  const {
    data: feedings = [],
    isLoading: loadingFeedings,
    error: errorFeedings,
    refetch: fetchFeedings,
  } = useQuery({
    queryKey: ['feedings', activeGalpon?.id, filters?.profileId, filters?.date],
    queryFn: () => {
      let startDate, endDate;
      if (filters?.date) {
        startDate = `${filters.date}T00:00:00-05:00`;
        endDate = `${filters.date}T23:59:59-05:00`;
      }
      return feedingService.getAll({ profileId: filters?.profileId, startDate, endDate }).catch((err) => {
        if (err instanceof Error && err.message.includes('403')) return [];
        throw err;
      });
    },
    enabled: !!activeGalpon,
  });

  // Query: Fetch Assigned Rabbits
  const {
    data: assignedRabbits = [],
    isLoading: loadingRabbits,
    error: errorRabbits,
  } = useQuery({
    queryKey: ['assignedRabbits', activeGalpon?.id],
    queryFn: () => assignmentService.getAssignedRabbits().catch((err) => {
      if (err instanceof Error && err.message.includes('403')) return [];
      throw err;
    }),
    enabled: !!activeGalpon,
  });

  // Query: Fetch Food Types
  const {
    data: foodTypes = [],
    isLoading: loadingFoodTypes,
  } = useQuery({
    queryKey: ['foodTypes', activeGalpon?.id],
    queryFn: () => feedingService.getFoodTypes().catch((err) => {
      if (err instanceof Error && err.message.includes('403')) return [];
      throw err;
    }),
    enabled: !!activeGalpon,
  });

  // Query: Fetch Assigned Cages
  const {
    data: assignedCageIds = [],
    isLoading: loadingCages,
  } = useQuery({
    queryKey: ['myMemberships', 'assignedCages', activeGalpon?.id],
    queryFn: async () => {
      try {
        const memberships = await farmMemberService.getMyMemberships();
        const activeMembership = memberships.find((m) => m.galponId === activeGalpon?.id);
        if (activeMembership?.assignedCages) {
          return activeMembership.assignedCages.map((ac: any) => ac.cageId);
        }
        return [];
      } catch (err) {
        console.error(err);
        return [];
      }
    },
    enabled: !!activeGalpon,
  });

  const loading = loadingFeedings || loadingRabbits || loadingFoodTypes || loadingCages;
  let errorStr = null;
  if (errorFeedings) {
    errorStr = (errorFeedings as Error).message;
  } else if (errorRabbits) {
    errorStr = (errorRabbits as Error).message;
  }
  const error = errorStr;

  // Mutation: Create Feeding
  const createFeedingMutation = useMutation({
    mutationFn: (payload: { cageIds: number[]; foodTypes: string[]; justification?: string; shift?: 'mañana' | 'tarde' }) => feedingService.create(payload),
    onSuccess: (newFeedings) => {
      // Optimizamos la actualización en caché para que la barra de progreso reaccione al instante
      queryClient.setQueryData(['feedings', activeGalpon?.id], (old: any[] = []) => {
        return [...newFeedings, ...old];
      });
      // También invalidamos para garantizar sincronización
      queryClient.invalidateQueries({ queryKey: ['feedings'] });
    },
  });

  const createFeeding = async (payload: { cageIds: number[]; foodTypes: string[]; justification?: string; shift?: 'mañana' | 'tarde' }) => {
    return createFeedingMutation.mutateAsync(payload);
  };

  const filteredAssignedRabbits = assignedCageIds.length > 0
    ? assignedRabbits.filter((rabbit: AssignedRabbit) => rabbit.cageId && assignedCageIds.includes(rabbit.cageId))
    : assignedRabbits;

  return { 
    feedings, 
    assignedRabbits: filteredAssignedRabbits, 
    foodTypes, 
    loading, 
    error, 
    fetchFeedings, 
    createFeeding 
  };
}
