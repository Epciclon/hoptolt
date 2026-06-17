'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cleaningService } from '../services/cleaning.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import type { Cleaning, CreateCleaningDto } from '../types/cleaning.types';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export function useCleaning() {
  const queryClient = useQueryClient();
  const { activeGalpon } = useActiveGalpon();

  // Query: Fetch Cleanings
  const {
    data: cleanings = [],
    isLoading: loadingCleanings,
    error: errorCleanings,
    refetch: fetchCleanings,
  } = useQuery({
    queryKey: ['cleanings', activeGalpon?.id],
    queryFn: () => cleaningService.getAll().catch(err => {
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
  } = useQuery({
    queryKey: ['assignedRabbits', activeGalpon?.id],
    queryFn: () => assignmentService.getAssignedRabbits().catch(err => {
      if (err instanceof Error && err.message.includes('403')) return [];
      throw err;
    }),
    enabled: !!activeGalpon,
  });

  // Query: Fetch Memberships
  const {
    data: membershipData,
    isLoading: loadingMembership,
  } = useQuery({
    queryKey: ['myMemberships', activeGalpon?.id],
    queryFn: async () => {
      try {
        const memberships = await farmMemberService.getMyMemberships();
        const activeMembership = memberships.find(m => m.galponId === activeGalpon?.id);
        if (activeMembership) {
          return {
            isWorker: activeMembership.role === 'worker',
            assignedCageIds: activeMembership.assignedCages ? activeMembership.assignedCages.map((ac: any) => ac.cageId) : []
          };
        }
        return { isWorker: false, assignedCageIds: [] };
      } catch (err) {
        return { isWorker: false, assignedCageIds: [] };
      }
    },
    enabled: !!activeGalpon,
  });

  const isWorker = membershipData?.isWorker || false;
  const assignedCageIds = membershipData?.assignedCageIds || [];

  const loading = loadingCleanings || loadingRabbits || loadingMembership;
  const error = errorCleanings ? (errorCleanings as Error).message : (errorRabbits ? (errorRabbits as Error).message : null);

  // Mutation: Create Cleaning
  const createCleaningMutation = useMutation({
    mutationFn: (payload: CreateCleaningDto) => cleaningService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanings'] });
    },
  });

  const createCleaning = async (payload: CreateCleaningDto) => {
    return createCleaningMutation.mutateAsync(payload);
  };

  const filteredAssignedRabbits = isWorker
    ? assignedRabbits.filter((rabbit: AssignedRabbit) => rabbit.cageId && assignedCageIds.includes(rabbit.cageId))
    : assignedRabbits;

  return { cleanings, assignedRabbits: filteredAssignedRabbits, loading, error, fetchCleanings, createCleaning };
}
