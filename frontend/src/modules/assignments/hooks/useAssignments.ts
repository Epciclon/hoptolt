'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentService } from '../services/assignment.service';
import type { Assignment } from '../types/assignment.types';

export function useAssignments() {
  const queryClient = useQueryClient();

  // Query: Fetch Assignments
  const {
    data: assignments = [],
    isLoading: loading,
    error: queryError,
    refetch: fetchAssignments,
  } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentService.getAll(),
  });

  const {
    data: operativeCages = [],
    isLoading: loadingCages,
  } = useQuery({
    queryKey: ['operativeCages'],
    queryFn: () => assignmentService.getOperativeCages(),
  });

  const {
    data: availableRabbits = [],
    isLoading: loadingRabbits,
  } = useQuery({
    queryKey: ['availableRabbits'],
    queryFn: () => assignmentService.getAvailableRabbits(),
  });

  const unassignRabbitMutation = useMutation({
    mutationFn: (id: number) => assignmentService.deleteById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignedRabbits'] });
      queryClient.invalidateQueries({ queryKey: ['operativeCages'] });
      queryClient.invalidateQueries({ queryKey: ['availableRabbits'] });
      queryClient.invalidateQueries({ queryKey: ['reproductionMales'] });
      queryClient.invalidateQueries({ queryKey: ['reproductionFemales'] });
    },
  });

  const unassignRabbit = async (id: number): Promise<boolean> => {
    await unassignRabbitMutation.mutateAsync(id);
    return true;
  };

  const assignRabbitsMutation = useMutation({
    mutationFn: (payload: { cageId: number; rabbitIds: number[] }) => assignmentService.assign(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignedRabbits'] });
      queryClient.invalidateQueries({ queryKey: ['operativeCages'] });
      queryClient.invalidateQueries({ queryKey: ['availableRabbits'] });
      queryClient.invalidateQueries({ queryKey: ['reproductionMales'] });
      queryClient.invalidateQueries({ queryKey: ['reproductionFemales'] });
    },
  });

  const assignRabbits = async (payload: { cageId: number; rabbitIds: number[] }): Promise<{ assignments: Assignment[]; warnings: string[] }> => {
    return assignRabbitsMutation.mutateAsync(payload);
  };

  return {
    assignments,
    operativeCages,
    availableRabbits,
    loading: loading || loadingCages || loadingRabbits,
    error: queryError ? (queryError as Error).message : null,
    fetchAssignments,
    assignRabbits,
    unassignRabbit,
  };
}
