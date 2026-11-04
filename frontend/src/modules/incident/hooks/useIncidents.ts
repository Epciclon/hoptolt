'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '../services/incident.service';
import type { CreateIncidentDTO, RespondIncidentDTO, GetIncidentsParams } from '../types/incident.types';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';
import { useToast } from '@/shared/contexts/ToastContext';

export function useIncidents(params?: GetIncidentsParams) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { showToast } = useToast();
  const supabase = createClient();

  const page = params?.page ?? 1;
  const limit = params?.limit ?? 12;
  const status = params?.status ?? '';
  const category = params?.category ?? '';
  const moduleName = params?.module ?? '';
  const search = params?.search ?? '';
  const isQueryEnabled = params?.enabled !== false && Boolean(user?.activeGalponId);

  // Query: Incidents list
  const {
    data,
    isPending,
    error,
    refetch
  } = useQuery({
    queryKey: ['incidents', 'list', user?.id, user?.activeGalponId, page, limit, status, category, moduleName, search],
    queryFn: () => incidentService.getAll(params),
    enabled: isQueryEnabled,
    placeholderData: (previousData) => previousData,
    staleTime: 2000,
    gcTime: 1000 * 60 * 30,
    refetchInterval: 4000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });

  // Solo se considera loading inicial si NO hay ningún dato previo
  const loading = isQueryEnabled && isPending && !data;

  // Query: Counts
  const {
    data: countsData,
    refetch: refetchCounts
  } = useQuery({
    queryKey: ['incidents', 'counts', user?.id, user?.activeGalponId],
    queryFn: () => incidentService.getCounts(),
    enabled: isQueryEnabled,
    placeholderData: (previousData) => previousData,
    staleTime: 2000,
    gcTime: 1000 * 60 * 30,
    refetchInterval: 4000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });

  // Realtime subscription via Supabase
  useEffect(() => {
    if (!isQueryEnabled || !user) return;

    const channelId = `realtime_incidents_${user.id}_${crypto.randomUUID()}`;
    const channel = supabase.channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents'
        },
        (payload: any) => {
          if (payload.eventType === 'DELETE' && payload.old?.id) {
            window.dispatchEvent(new CustomEvent('incident-deleted', { detail: { incidentId: payload.old.id } }));
          }
          queryClient.invalidateQueries({ queryKey: ['incidents'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `profileId=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['incidents'] });
        }
      )
      .subscribe();

    const handleCustomUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    };
    window.addEventListener('incidents-updated', handleCustomUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('incidents-updated', handleCustomUpdate);
    };
  }, [isQueryEnabled, user?.id, user?.activeGalponId, supabase, queryClient]);

  // Mutation: Create Incident
  const createMutation = useMutation({
    mutationFn: (dto: CreateIncidentDTO) => incidentService.create(dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.refetchQueries({ queryKey: ['incidents'] });
      window.dispatchEvent(new CustomEvent('incidents-updated'));
      showToast('Novedad reportada con éxito.', 'success');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Error al reportar la novedad.';
      showToast(msg, 'error');
    }
  });

  // Mutation: Respond Incident
  const respondMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: RespondIncidentDTO }) => incidentService.respond(id, dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.refetchQueries({ queryKey: ['incidents'] });
      window.dispatchEvent(new CustomEvent('incidents-updated'));
      showToast('Respuesta registrada con éxito.', 'success');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Error al responder a la novedad.';
      showToast(msg, 'error');
    }
  });

  // Mutation: Mark As Read
  const markAsReadMutation = useMutation({
    mutationFn: (id: number | 'all') => incidentService.markAsRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.refetchQueries({ queryKey: ['incidents'] });
      window.dispatchEvent(new CustomEvent('incidents-updated'));
    }
  });

  // Mutation: Delete Incident
  const deleteMutation = useMutation({
    mutationFn: (id: number) => incidentService.delete(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['incidents'] });

      const previousLists = queryClient.getQueriesData({ queryKey: ['incidents', 'list'] });
      const previousCounts = queryClient.getQueriesData({ queryKey: ['incidents', 'counts'] });

      queryClient.setQueriesData({ queryKey: ['incidents', 'list'] }, (old: any) => {
        if (!old?.incidents) return old;
        return {
          ...old,
          incidents: old.incidents.filter((item: any) => item.id !== id),
          pagination: {
            ...old.pagination,
            total: Math.max(0, (old.pagination?.total || 1) - 1)
          }
        };
      });

      queryClient.setQueriesData({ queryKey: ['incidents', 'counts'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          total: Math.max(0, (old.total || 1) - 1),
          pending: Math.max(0, (old.pending || 1) - 1),
          unread: Math.max(0, (old.unread || 1) - 1)
        };
      });

      window.dispatchEvent(new CustomEvent('incident-deleted', { detail: { incidentId: id } }));
      window.dispatchEvent(new CustomEvent('incidents-updated'));

      return { previousLists, previousCounts };
    },
    onError: (err: any, _id, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([key, val]) => queryClient.setQueryData(key, val));
      }
      if (context?.previousCounts) {
        context.previousCounts.forEach(([key, val]) => queryClient.setQueryData(key, val));
      }
      const msg = err.response?.data?.message || 'Error al eliminar la novedad.';
      showToast(msg, 'error');
    },
    onSuccess: () => {
      showToast('Novedad eliminada exitosamente.', 'success');
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['incidents'] });
    }
  });

  return {
    incidents: data?.incidents || [],
    pagination: data?.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 },
    userRole: data?.userRole || countsData?.role || (user?.role === 'owner' ? 'owner' : 'worker'),
    counts: countsData || { role: (user?.role === 'owner' ? 'owner' : 'worker'), total: 0, pending: 0, reviewed: 0, unread: 0 },
    loading,
    error,
    refetch,
    refetchCounts,
    createIncident: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    respondToIncident: respondMutation.mutateAsync,
    isResponding: respondMutation.isPending,
    markAsRead: markAsReadMutation.mutateAsync,
    deleteIncident: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending
  };
}
