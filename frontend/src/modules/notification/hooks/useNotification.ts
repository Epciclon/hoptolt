'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';
import type { CreateNotificationDTO } from '../types/notification.types';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/modules/auth/contexts/AuthContext';

export function useNotifications(options?: { limit?: number; offset?: number; unreadOnly?: boolean }) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
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
          // Invalidate queries so React Query fetches the new data automatically
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, supabase]);

  // Mutation: Mark as Read
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Mutation: Mark all as Read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Mutation: Delete
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => notificationService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
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
