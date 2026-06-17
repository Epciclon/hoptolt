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

  const unassignRabbitMutation = useMutation({
    mutationFn: (id: number) => assignmentService.deleteById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignedRabbits'] });
    },
  });

  const unassignRabbit = async (id: number): Promise<boolean> => {
    try {
      await unassignRabbitMutation.mutateAsync(id);
      return true;
    } catch (err) {
      return false;
    }
  };

  const assignRabbitsMutation = useMutation({
    mutationFn: (payload: { cageId: number; rabbitIds: number[] }) => assignmentService.assign(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignedRabbits'] });
    },
  });

  const assignRabbits = async (payload: { cageId: number; rabbitIds: number[] }): Promise<{ assignments: Assignment[]; warnings: string[] }> => {
    return assignRabbitsMutation.mutateAsync(payload);
  };

  return {
    assignments,
    loading,
    error: queryError ? (queryError as Error).message : null,
    fetchAssignments,
    unassignRabbit,
    assignRabbits,
  };
}
