import api from '@/lib/api';
import type { Notification, CreateNotificationDTO } from '../types/notification.types';

const BASE_URL = '/notifications';

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  freshSession?: boolean;
  filter?: string;
  search?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const notificationService = {
  async getAll(params?: GetNotificationsParams): Promise<NotificationsResponse> {
    const { data } = await api.get<{ success?: boolean; notifications?: Notification[]; pagination?: any }>(BASE_URL, { params });
    if (data && data.notifications) {
      return {
        notifications: data.notifications,
        pagination: data.pagination || {
          page: params?.page || 1,
          limit: params?.limit || 12,
          total: data.notifications.length,
          totalPages: 1
        }
      };
    }
    if (Array.isArray(data)) {
      return {
        notifications: data as unknown as Notification[],
        pagination: {
          page: params?.page || 1,
          limit: params?.limit || 12,
          total: (data as any[]).length,
          totalPages: 1
        }
      };
    }
    return {
      notifications: [],
      pagination: { total: 0, page: 1, limit: 12, totalPages: 1 }
    };
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
