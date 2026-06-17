'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedingService } from '../services/feeding.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import type { Feeding } from '../types/feeding.types';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export function useFeeding() {
  const queryClient = useQueryClient();
  const { activeGalpon } = useActiveGalpon();

  // Query: Fetch Feedings
  const {
    data: feedings = [],
    isLoading: loadingFeedings,
    error: errorFeedings,
    refetch: fetchFeedings,
  } = useQuery({
    queryKey: ['feedings', activeGalpon?.id],
    queryFn: () => feedingService.getAll().catch((err) => {
      if (err instanceof Error && err.message.includes('403')) return [];
      throw err;
    }),
    enabled: !!activeGalpon,
  });

  // Query: Fetch Assigned Rabbits
  const {
    data: assignedRabbits = [],
    isLoading: loadingRabbits,
    error: errorRabbits,
    refetch: fetchAssignedRabbits,
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
        if (activeMembership && activeMembership.assignedCages) {
          return activeMembership.assignedCages.map((ac: any) => ac.cageId);
        }
        return [];
      } catch (err) {
        return [];
      }
    },
    enabled: !!activeGalpon,
  });

  const loading = loadingFeedings || loadingRabbits || loadingFoodTypes || loadingCages;
  const error = errorFeedings ? (errorFeedings as Error).message : (errorRabbits ? (errorRabbits as Error).message : null);

  // Mutation: Create Feeding
  const createFeedingMutation = useMutation({
    mutationFn: (payload: { cageIds: number[]; foodTypes: string[]; justification?: string }) => feedingService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedings'] });
    },
  });

  const createFeeding = async (payload: { cageIds: number[]; foodTypes: string[]; justification?: string }) => {
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
