import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll fetches notifications with options', async () => {
    const mockNotifications = [{ id: 1, message: 'Test' }];
    vi.mocked(api.get).mockResolvedValue({ data: mockNotifications });

    const { notificationService } = await import('@/modules/notification/services/notification.service');
    const result = await notificationService.getAll({ limit: 10, offset: 0 });

    expect(api.get).toHaveBeenCalledWith('/notifications', { params: { limit: 10, offset: 0 } });
    expect(result).toEqual({
      notifications: mockNotifications,
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
  });

  it('getAll passes unreadOnly filter', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });

    const { notificationService } = await import('@/modules/notification/services/notification.service');
    await notificationService.getAll({ unreadOnly: true });

    expect(api.get).toHaveBeenCalledWith('/notifications', { params: { unreadOnly: true } });
  });

  it('getUnreadCount returns unread count', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { count: 5 } });

    const { notificationService } = await import('@/modules/notification/services/notification.service');
    const result = await notificationService.getUnreadCount();

    expect(api.get).toHaveBeenCalledWith('/notifications/unread-count', { params: undefined });
    expect(result).toEqual({ count: 5 });
  });

  it('markAsRead marks a notification as read', async () => {
    const mockNotification = { id: 1, read: true };
    vi.mocked(api.patch).mockResolvedValue({ data: mockNotification });

    const { notificationService } = await import('@/modules/notification/services/notification.service');
    const result = await notificationService.markAsRead(1);

    expect(api.patch).toHaveBeenCalledWith('/notifications/1/read');
    expect(result).toEqual(mockNotification);
  });

  it('markAllAsRead marks all notifications as read', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });

    const { notificationService } = await import('@/modules/notification/services/notification.service');
    const result = await notificationService.markAllAsRead();

    expect(api.patch).toHaveBeenCalledWith('/notifications/mark-all-read');
    expect(result).toEqual({ success: true });
  });

  it('delete removes a notification', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    const { notificationService } = await import('@/modules/notification/services/notification.service');
    const result = await notificationService.delete(1);

    expect(api.delete).toHaveBeenCalledWith('/notifications/1');
    expect(result).toEqual({ success: true });
  });
});
