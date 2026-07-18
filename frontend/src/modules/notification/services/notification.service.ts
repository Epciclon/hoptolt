import api from '@/lib/api';
import type { Notification, CreateNotificationDTO } from '../types/notification.types';

const BASE_URL = '/notifications';

export const notificationService = {
  async getAll(options?: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<Notification[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.unreadOnly) params.append('unreadOnly', 'true');
    
    const response = await api.get(`${BASE_URL}?${params.toString()}`);
    return response.data;
  },

  async getUnreadCount(): Promise<{ count: number }> {
    const response = await api.get(`${BASE_URL}/unread-count`);
    return response.data;
  },

  async markAsRead(id: number): Promise<Notification> {
    const response = await api.patch(`${BASE_URL}/${id}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    const response = await api.patch(`${BASE_URL}/mark-all-read`);
    return response.data;
  },

  async delete(id: number): Promise<{ success: boolean }> {
    const response = await api.delete(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Este método es solo para uso interno del sistema (no expuesto al frontend)
  async create(data: CreateNotificationDTO): Promise<Notification> {
    const response = await api.post(BASE_URL, data);
    return response.data;
  }
};
