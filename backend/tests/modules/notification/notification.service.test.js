require('../../setup');

jest.mock('../../../src/modules/notification/notification.repository');
jest.mock('../../../src/modules/growth/growth.service', () => ({
  processDailyGrowth: jest.fn().mockResolvedValue(undefined),
}));

const notificationRepository = require('../../../src/modules/notification/notification.repository');
const notificationService = require('../../../src/modules/notification/notification.service');
const growthService = require('../../../src/modules/growth/growth.service');
const { Notification, FarmMember, Galpon, Reproduction, Rabbit, Cage, Cleaning, WorkerCage, WorkerPermission, Assignment } = require('../../../src/domain/models');

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('creates a notification and returns DTO', async () => {
      notificationRepository.create.mockResolvedValue({ id: 1, type: 'info', title: 'Test', message: 'Hello', data: null, read: false, createdAt: '2024-01-01' });

      const result = await notificationService.createNotification('p1', { type: 'info', title: 'Test', message: 'Hello', data: null });
      expect(result.id).toBe(1);
      expect(result.title).toBe('Test');
    });
  });

  describe('createRabbitAssignmentNotification', () => {
    beforeEach(() => {
      Cage.findByPk = jest.fn().mockResolvedValue({ id: 1, number: 5 });
      WorkerCage.findAll = jest.fn().mockResolvedValue([{ farmMemberId: 1 }]);
      FarmMember.findAll = jest.fn().mockResolvedValue([{ id: 1, role: 'worker', status: 'active', profileId: 'w1' }]);
      Notification.bulkCreate = jest.fn().mockResolvedValue([{ id: 1 }]);
    });

    it('notifies workers about rabbit assignment', async () => {
      await notificationService.createRabbitAssignmentNotification(1, 'R001', true);
      expect(Notification.bulkCreate).toHaveBeenCalled();
    });

    it('does nothing when cage not found', async () => {
      Cage.findByPk = jest.fn().mockResolvedValue(null);
      await expect(notificationService.createRabbitAssignmentNotification(1, 'R001', true)).resolves.not.toThrow();
    });
  });

  describe('getNotificationsByProfile', () => {
    beforeEach(() => {
      FarmMember.findAll = jest.fn().mockResolvedValue([]);
      Galpon.findAll = jest.fn().mockResolvedValue([]);
      Assignment.findAll = jest.fn().mockResolvedValue([]);
      Notification.findAll = jest.fn().mockResolvedValue([]);
      notificationRepository.findByProfileId.mockResolvedValue([{ id: 1, type: 'info', title: 'Test', message: 'Hello', data: null, read: false, createdAt: '2024-01-01' }]);
    });

    it('returns notifications with auto-checks', async () => {
      const result = await notificationService.getNotificationsByProfile('p1');
      expect(result).toHaveLength(1);
      expect(growthService.processDailyGrowth).toHaveBeenCalledWith('p1');
    });
  });

  describe('getUnreadCount', () => {
    beforeEach(() => {
      FarmMember.findAll = jest.fn().mockResolvedValue([]);
      Galpon.findAll = jest.fn().mockResolvedValue([]);
      Assignment.findAll = jest.fn().mockResolvedValue([]);
      Notification.findAll = jest.fn().mockResolvedValue([]);
      notificationRepository.countUnread.mockResolvedValue(3);
    });

    it('returns unread count', async () => {
      const result = await notificationService.getUnreadCount('p1');
      expect(result).toBe(3);
    });
  });

  describe('markAsRead', () => {
    it('marks notification as read', async () => {
      notificationRepository.markAsRead.mockResolvedValue({ id: 1, read: true, type: 'info', title: 'Test', message: '', data: null, createdAt: '2024-01-01' });

      const result = await notificationService.markAsRead(1);
      expect(result.read).toBe(true);
    });

    it('returns null when not found', async () => {
      notificationRepository.markAsRead.mockResolvedValue(null);
      const result = await notificationService.markAsRead(999);
      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read', async () => {
      notificationRepository.markAllAsRead.mockResolvedValue(undefined);
      const result = await notificationService.markAllAsRead('p1');
      expect(result.success).toBe(true);
    });
  });

  describe('deleteNotification', () => {
    it('deletes notification', async () => {
      notificationRepository.delete = jest.fn().mockResolvedValue(true);
      const result = await notificationService.deleteNotification(1);
      expect(notificationRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('checkAndCreateBirthNotifications', () => {
    beforeEach(() => {
      FarmMember.findAll = jest.fn().mockResolvedValue([]);
      Galpon.findAll = jest.fn().mockResolvedValue([{ id: 1 }]);
    });

    it('checks and creates birth notifications', async () => {
      Reproduction.findAll = jest.fn().mockResolvedValue([]);
      Notification.findAll = jest.fn().mockResolvedValue([]);
      Notification.bulkCreate = jest.fn().mockResolvedValue([]);

      await expect(notificationService.checkAndCreateBirthNotifications('p1')).resolves.not.toThrow();
    });
  });

  describe('checkAndCreateWeaningNotifications', () => {
    beforeEach(() => {
      FarmMember.findAll = jest.fn().mockResolvedValue([]);
      Galpon.findAll = jest.fn().mockResolvedValue([]);
    });

    it('checks and creates weaning notifications', async () => {
      Reproduction.findAll = jest.fn().mockResolvedValue([]);
      Notification.findAll = jest.fn().mockResolvedValue([]);
      Notification.bulkCreate = jest.fn().mockResolvedValue([]);

      await expect(notificationService.checkAndCreateWeaningNotifications('p1')).resolves.not.toThrow();
    });
  });

  describe('checkAndCreateCleaningNotifications', () => {
    beforeEach(() => {
      Assignment.findAll = jest.fn().mockResolvedValue([{ cageId: 1 }]);
      FarmMember.findAll = jest.fn().mockResolvedValue([]);
      Galpon.findAll = jest.fn().mockResolvedValue([{ id: 1 }]);
    });

    it('checks and creates cleaning notifications', async () => {
      Cage.findAll = jest.fn().mockResolvedValue([{ id: 1, number: 5 }]);
      Cleaning.findAll = jest.fn().mockResolvedValue([{ cageId: 1, cleaningDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }]);
      Assignment.findAll = jest.fn().mockResolvedValue([{ cageId: 1 }]);
      Notification.findAll = jest.fn().mockResolvedValue([]);
      Notification.bulkCreate = jest.fn().mockResolvedValue([]);

      await expect(notificationService.checkAndCreateCleaningNotifications('p1')).resolves.not.toThrow();
    });

    it('does nothing when no assigned cages', async () => {
      Assignment.findAll = jest.fn().mockResolvedValue([]);
      await expect(notificationService.checkAndCreateCleaningNotifications('p1')).resolves.not.toThrow();
    });
  });
});
