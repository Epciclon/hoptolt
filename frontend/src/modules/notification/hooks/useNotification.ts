'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';
import type { CreateNotificationDTO } from '../types/notification.types';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function useNotifications(options?: { limit?: number; offset?: number; unreadOnly?: boolean }) {
  const queryClient = useQueryClient();
  const { user, refetchUser } = useAuthContext();
  const supabase = createClient();

  // Query: Fetch Notifications
  const {
    data: notifications = [],
    isLoading: loading,
    error: queryError,
    refetch: fetchNotifications,
  } = useQuery({
    queryKey: ['notifications', options],
    queryFn: () => notificationService.getAll(options),
    enabled: !!user,
  });

  // Query: Unread Count
  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: !!user,
  });
  
  const unreadCount = unreadCountData?.count || 0;

  // Realtime Subscription
  useEffect(() => {
    if (!user) return;

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
        () => {
          // Invalidate all queries globally so modules (Vaccination, Reproduction, etc.)
          // fetch newly assigned cages or updated data automatically without page reload.
          queryClient.invalidateQueries();
          
          // Also refetch the user profile silently to update permissions in realtime
          if (refetchUser) {
            refetchUser(true);
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
          // When a rabbit is assigned or unassigned from a cage by ANY user, 
          // we invalidate the cache so everyone sees the rabbit appear/disappear instantly.
          queryClient.invalidateQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, supabase, refetchUser]);

  // Mutation: Mark as Read
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previousNotifications = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old;
        return old.map((n: any) => n.id === id ? { ...n, read: true } : n);
      });
      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
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
      const previousNotifications = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old;
        return old.map((n: any) => ({ ...n, read: true }));
      });
      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
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
      const previousNotifications = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!old) return old;
        return old.filter((n: any) => n.id !== id);
      });
      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
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
