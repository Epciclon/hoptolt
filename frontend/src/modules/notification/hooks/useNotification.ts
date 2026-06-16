'use client';

import { useState, useCallback, useEffect } from 'react';
import { notificationService } from '../services/notification.service';
import type { Notification, CreateNotificationDTO } from '../types/notification.types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (options?: { limit?: number; offset?: number; unreadOnly?: boolean }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getAll(options);
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar notificaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await notificationService.getUnreadCount();
      setUnreadCount(result.count);
    } catch (err) {
      console.error('Error al cargar contador de no leídas:', err);
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al marcar notificación como leída.');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al marcar todas como leídas.');
    }
  }, []);

  const deleteNotification = useCallback(async (id: number) => {
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      const deleted = notifications.find(n => n.id === id);
      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar notificación.');
    }
  }, [notifications]);

  const addNotification = useCallback(async (data: CreateNotificationDTO) => {
    try {
      const newNotification = await notificationService.create(data);
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    } catch (err) {
      console.error('Error al crear notificación:', err);
    }
  }, []);

  // Cargar notificaciones y contador al montar
  useEffect(() => {
    fetchNotifications({ limit: 20 });
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification
  };
}
