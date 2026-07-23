'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cleaningService } from '../services/cleaning.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import type { CreateCleaningDto } from '../types/cleaning.types';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export function useCleaning(filters?: { profileId?: string; date?: string }) {
  const queryClient = useQueryClient();
  const { activeGalpon } = useActiveGalpon();

  // Query: Fetch Cleanings
  const {
    data: cleanings = [],
    isLoading: loadingCleanings,
    error: errorCleanings,
    refetch: fetchCleanings,
  } = useQuery({
    queryKey: ['cleanings', activeGalpon?.id, filters?.profileId, filters?.date],
    queryFn: () => {
      let startDate, endDate;
      if (filters?.date) {
        startDate = `${filters.date}T00:00:00-05:00`;
        endDate = `${filters.date}T23:59:59-05:00`;
      }
      return cleaningService.getAll({ profileId: filters?.profileId, startDate, endDate }).catch(err => {
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
        console.error(err);
        return { isWorker: false, assignedCageIds: [] };
      }
    },
    enabled: !!activeGalpon,
  });

  const isWorker = membershipData?.isWorker || false;
  const assignedCageIds = membershipData?.assignedCageIds || [];

  const loading = loadingCleanings || loadingRabbits || loadingMembership;
  let errorStr = null;
  if (errorCleanings) {
    errorStr = (errorCleanings as Error).message;
  } else if (errorRabbits) {
    errorStr = (errorRabbits as Error).message;
  }
  const error = errorStr;

  const createCleaningMutation = useMutation({
    mutationFn: (payload: CreateCleaningDto) => cleaningService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanings'] });
      queryClient.invalidateQueries({ queryKey: ['active-dates'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
