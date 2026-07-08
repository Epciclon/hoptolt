'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mortalityService } from '../services/mortality.service';
import { assignmentService } from '@/modules/assignments/services/assignment.service';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import type { CreateMortalityDto } from '../types/mortality.types';
import type { AssignedRabbit } from '@/modules/assignments/types/assignment.types';

export function useMortality() {
  const queryClient = useQueryClient();
  const { activeGalpon } = useActiveGalpon();

  // Query: Fetch Mortalities
  const {
    data: mortalities = [],
    isLoading: loadingMortalities,
    error: errorMortalities,
    refetch: fetchMortalities,
  } = useQuery({
    queryKey: ['mortalities', activeGalpon?.id],
    queryFn: () => mortalityService.getAll(undefined, false).catch(err => {
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
    queryFn: () => assignmentService.getAssignedRabbits().catch(err => {
      if (err instanceof Error && err.message.includes('403')) return [];
      throw err;
    }),
    enabled: !!activeGalpon,
  });

  // Query: Fetch Assigned Cages (Membership)
  const {
    data: membershipData,
    isLoading: loadingMembership,
  } = useQuery({
    queryKey: ['myMemberships', activeGalpon?.id],
    queryFn: async () => {
      const memberships = await farmMemberService.getMyMemberships();
      const activeMembership = memberships.find(m => m.galponId === activeGalpon?.id);
      if (activeMembership) {
        return {
          isWorker: activeMembership.role === 'worker',
          assignedCageIds: activeMembership.assignedCages ? activeMembership.assignedCages.map((ac: any) => ac.cageId) : [],
        };
      }
      return { isWorker: false, assignedCageIds: [] };
    },
    enabled: !!activeGalpon,
  });

  const isWorker = membershipData?.isWorker || false;
  const assignedCageIds = membershipData?.assignedCageIds || [];

  const loading = loadingMortalities || loadingRabbits || loadingMembership;
  let error = null;
  if (errorMortalities) {
    error = (errorMortalities as Error).message;
  } else if (errorRabbits) {
    error = (errorRabbits as Error).message;
  }

  // Mutation: Create Mortality
  const createMortalityMutation = useMutation({
    mutationFn: (payload: CreateMortalityDto) => mortalityService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortalities'] });
      queryClient.invalidateQueries({ queryKey: ['assignedRabbits'] });
      queryClient.invalidateQueries({ queryKey: ['reproductions'] });
      queryClient.invalidateQueries({ queryKey: ['kitMortalitiesHistory'] });
    },
  });

  const createMortality = async (payload: CreateMortalityDto) => {
    return createMortalityMutation.mutateAsync(payload);
  };

  const filteredAssignedRabbits = isWorker
    ? assignedRabbits.filter((rabbit: AssignedRabbit) => rabbit.cageId && assignedCageIds.includes(rabbit.cageId))
    : assignedRabbits;

  return {
    mortalities,
    assignedRabbits: filteredAssignedRabbits,
    loading,
    error,
    fetchMortalities,
    fetchAssignedRabbits,
    createMortality,
  };
}
