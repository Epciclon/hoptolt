'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { farmMemberService } from '../services/farmMember.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';

export function useFarmMember() {
  const queryClient = useQueryClient();
  const { activeGalpon } = useActiveGalpon();

  const {
    data: workers = [],
    isLoading: loading,
    error: queryError,
    refetch: fetchWorkers,
  } = useQuery({
    queryKey: ['workers', activeGalpon?.id],
    queryFn: () => farmMemberService.getWorkersByGalpon(activeGalpon!.id),
    enabled: !!activeGalpon,
  });

  const removeWorkerMutation = useMutation({
    mutationFn: (id: number) => farmMemberService.removeWorker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });

  const removeWorker = async (id: number) => {
    try {
      await removeWorkerMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => farmMemberService.updateWorker(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });

  const updateWorker = async (id: number, data: any) => {
    try {
      await updateWorkerMutation.mutateAsync({ id, data });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  return {
    workers,
    loading,
    error: queryError ? (queryError as Error).message : null,
    fetchWorkers,
    removeWorker,
    updateWorker,
  };
}
