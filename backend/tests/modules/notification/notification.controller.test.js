jest.mock('../../../src/modules/notification/notification.service');
const notificationService = require('../../../src/modules/notification/notification.service');

jest.mock('../../../src/modules/notification/notification.validator', () => ({
  createNotificationSchema: {
    validate: jest.fn()
  }
}));
const { createNotificationSchema } = require('../../../src/modules/notification/notification.validator');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const notificationController = require('../../../src/modules/notification/notification.controller');

describe('NotificationController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('createNotification', () => {
    it('should create notification and return 201', async () => {
      req = { user: { id: 'user1' }, body: { title: 'Test', message: 'Test message' } };
      createNotificationSchema.validate.mockReturnValue({ error: undefined });
      notificationService.createNotification.mockResolvedValue({ id: 'n1', title: 'Test' });

      await notificationController.createNotification(req, res, next);

      expect(createNotificationSchema.validate).toHaveBeenCalledWith(req.body);
      expect(notificationService.createNotification).toHaveBeenCalledWith('user1', req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'n1', title: 'Test' });
    });

    it('should throw error when validation fails', async () => {
      req = { user: { id: 'user1' }, body: {} };
      createNotificationSchema.validate.mockReturnValue({
        error: { details: [{ message: 'Title is required' }] }
      });

      await notificationController.createNotification(req, res, next);
      await new Promise(process.nextTick);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('getMyNotifications', () => {
    it('should call getNotificationsByProfile and return 200', async () => {
      req = { user: { id: 'user1' }, query: { limit: '10', offset: '0', unreadOnly: 'true' } };
      notificationService.getNotificationsByProfile.mockResolvedValue([{ id: 'n1' }]);

      await notificationController.getMyNotifications(req, res, next);

      expect(notificationService.getNotificationsByProfile).toHaveBeenCalledWith('user1', {
        limit: 10, offset: 0, unreadOnly: true
      });
      expect(res.json).toHaveBeenCalledWith([{ id: 'n1' }]);
    });

    it('should use defaults when query params are missing', async () => {
      req = { user: { id: 'user1' }, query: {} };
      notificationService.getNotificationsByProfile.mockResolvedValue([]);

      await notificationController.getMyNotifications(req, res, next);

      expect(notificationService.getNotificationsByProfile).toHaveBeenCalledWith('user1', {
        limit: 20, offset: 0, unreadOnly: false
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should call getUnreadCount and return count', async () => {
      req = { user: { id: 'user1' } };
      notificationService.getUnreadCount.mockResolvedValue(5);

      await notificationController.getUnreadCount(req, res, next);

      expect(notificationService.getUnreadCount).toHaveBeenCalledWith('user1');
      expect(res.json).toHaveBeenCalledWith({ count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and return 200', async () => {
      req = { params: { id: 'n1' } };
      notificationService.markAsRead.mockResolvedValue({ id: 'n1', readAt: new Date() });

      await notificationController.markAsRead(req, res, next);

      expect(notificationService.markAsRead).toHaveBeenCalledWith('n1');
      expect(res.json).toHaveBeenCalledWith({ id: 'n1', readAt: expect.any(Date) });
    });

    it('should throw error when notification not found', async () => {
      req = { params: { id: 'n1' } };
      notificationService.markAsRead.mockResolvedValue(null);

      await notificationController.markAsRead(req, res, next);
      await new Promise(process.nextTick);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('markAllAsRead', () => {
    it('should call markAllAsRead and return result', async () => {
      req = { user: { id: 'user1' } };
      notificationService.markAllAsRead.mockResolvedValue({ count: 3 });

      await notificationController.markAllAsRead(req, res, next);

      expect(notificationService.markAllAsRead).toHaveBeenCalledWith('user1');
      expect(res.json).toHaveBeenCalledWith({ count: 3 });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification and return success', async () => {
      req = { params: { id: 'n1' } };
      notificationService.deleteNotification.mockResolvedValue(true);

      await notificationController.deleteNotification(req, res, next);

      expect(notificationService.deleteNotification).toHaveBeenCalledWith('n1');
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should throw error when notification not found', async () => {
      req = { params: { id: 'n1' } };
      notificationService.deleteNotification.mockResolvedValue(false);

      await notificationController.deleteNotification(req, res, next);
      await new Promise(process.nextTick);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
