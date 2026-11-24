'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService, type GetNotificationsParams } from '../services/notification.service';
import type { CreateNotificationDTO } from '../types/notification.types';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function useNotifications(options?: GetNotificationsParams) {
  const queryClient = useQueryClient();
  const { user, refetchUser } = useAuthContext();
  const supabase = createClient();

  // Query: Fetch Notifications
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch: fetchNotifications,
  } = useQuery({
    queryKey: ['notifications', options],
    queryFn: () => notificationService.getAll(options),
    enabled: !!user,
    staleTime: 10000,
    refetchInterval: 30000, // Respaldo cada 30s; Supabase Realtime actualiza al instante en primer plano
    refetchIntervalInBackground: false,
  });

  const rawNotifications = data?.notifications || [];
  const notifications = rawNotifications.filter((n: any) => {
    const t = n.data?.type;
    if (t === 'incident' || t === 'incident_response') return false;
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    if (title.includes('novedad') || msg.includes('novedad')) return false;
    return true;
  });
  const pagination = data?.pagination || { total: 0, page: options?.page || 1, limit: options?.limit || 12, totalPages: 1 };

  // Query: Unread Count
  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications', 'unreadCount', options?.filter],
    queryFn: () => notificationService.getUnreadCount(options?.filter),
    enabled: !!user,
    staleTime: 10000,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
  
  const unreadCount = unreadCountData?.count || 0;

  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const globalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Realtime Subscription
  useEffect(() => {
    if (!user) return;

    const scheduleGlobalInvalidate = () => {
      if (globalTimerRef.current) clearTimeout(globalTimerRef.current);
      globalTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries();
      }, 300);
    };

    const channelId = `realtime_notifications_${user.id}_${crypto.randomUUID()}`;
    const channel = supabase.channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `profileId=eq.${user.id}`,
        },
        (payload: any) => {
          if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
          notifTimerRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }, 400);

          const isInsert = payload?.eventType === 'INSERT';
          const row = payload?.new;
          const rowType = row?.type;
          const dataType = row?.data?.type;
          const titleLower = String(row?.title || '').toLowerCase();
          const affectsAccessOrGalpon =
            isInsert &&
            (rowType === 'invitation' ||
              rowType === 'error' ||
              dataType === 'task_assignment' ||
              Boolean(row?.data?.isContract) ||
              titleLower.includes('galpón') ||
              titleLower.includes('eliminado') ||
              titleLower.includes('invitación'));

          if (affectsAccessOrGalpon) {
            if (globalTimerRef.current) clearTimeout(globalTimerRef.current);
            globalTimerRef.current = setTimeout(() => {
              queryClient.invalidateQueries();
            }, 500);

            if (refetchUser) {
              if (userRefetchTimerRef.current) clearTimeout(userRefetchTimerRef.current);
              userRefetchTimerRef.current = setTimeout(() => {
                void refetchUser(true);
              }, 500);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assign_rabbits',
        },
        () => {
          scheduleGlobalInvalidate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reproductions',
        },
        () => {
          scheduleGlobalInvalidate();
        }
      )
      .subscribe();

    return () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
      if (globalTimerRef.current) clearTimeout(globalTimerRef.current);
      if (userRefetchTimerRef.current) clearTimeout(userRefetchTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, supabase, refetchUser]);

  // Mutation: Mark as Read
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      // We don't save previous state here easily because there can be multiple queries,
      // but typically we can just rely on invalidation if it fails.
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((n: any) => n.id === id ? { ...n, read: true } : n);
        }
        if (old.notifications) {
          return {
            ...old,
            notifications: old.notifications.map((n: any) => n.id === id ? { ...n, read: true } : n)
          };
        }
        return old;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mutation: Mark all as Read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old) return old;
        const isTaskReminder = (n: any) => !n.data?.isContract && (
          n.type === 'warning' ||
          n.data?.type === 'feeding_reminder' ||
          n.data?.type === 'cleaning_warning' ||
          n.data?.type === 'birth_warning' ||
          n.data?.type === 'weaning_alert'
        );
        if (Array.isArray(old)) {
          return old.map((n: any) => isTaskReminder(n) ? n : { ...n, read: true });
        }
        if (old.notifications) {
          return {
            ...old,
            notifications: old.notifications.map((n: any) => isTaskReminder(n) ? n : { ...n, read: true })
          };
        }
        return old;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mutation: Delete
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => notificationService.delete(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.filter((n: any) => n.id !== id);
        }
        if (old.notifications) {
          return {
            ...old,
            notifications: old.notifications.filter((n: any) => n.id !== id),
            pagination: old.pagination ? { ...old.pagination, total: Math.max(0, old.pagination.total - 1) } : old.pagination
          };
        }
        return old;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mutation: Add
  const addNotificationMutation = useMutation({
    mutationFn: (data: CreateNotificationDTO) => notificationService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return {
    notifications,
    pagination,
    unreadCount,
    loading,
    error: queryError ? (queryError as Error).message : null,
    fetchNotifications,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    deleteNotification: deleteNotificationMutation.mutateAsync,
    addNotification: addNotificationMutation.mutateAsync,
  };
}
