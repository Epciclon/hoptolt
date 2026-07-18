jest.mock('../../../src/domain/models', () => ({
  Notification: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
}))

const { Notification } = require('../../../src/domain/models')
const notificationRepository = require('../../../src/modules/notification/notification.repository')

describe('NotificationRepository', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('create', () => {
    it('calls Notification.create with data', async () => {
      Notification.create.mockResolvedValue({ id: 1 })
      const result = await notificationRepository.create({ profileId: 'p1', message: 'Test' })
      expect(Notification.create).toHaveBeenCalledWith({ profileId: 'p1', message: 'Test' })
      expect(result.id).toBe(1)
    })
  })

  describe('findByProfileId', () => {
    it('returns notifications with default pagination', async () => {
      Notification.findAll.mockResolvedValue([{ id: 1 }])
      const result = await notificationRepository.findByProfileId('p1')
      expect(Notification.findAll).toHaveBeenCalledWith({
        where: { profileId: 'p1' },
        order: [['createdAt', 'DESC']],
        limit: 20,
        offset: 0,
      })
      expect(result).toHaveLength(1)
    })

    it('filters unread only when specified', async () => {
      Notification.findAll.mockResolvedValue([{ id: 1 }])
      await notificationRepository.findByProfileId('p1', { unreadOnly: true })
      expect(Notification.findAll).toHaveBeenCalledWith({
        where: { profileId: 'p1', read: false },
        order: [['createdAt', 'DESC']],
        limit: 20,
        offset: 0,
      })
    })
  })

  describe('findById', () => {
    it('calls Notification.findByPk', async () => {
      Notification.findByPk.mockResolvedValue({ id: 1 })
      expect(await notificationRepository.findById(1)).toEqual({ id: 1 })
    })
  })

  describe('markAsRead', () => {
    it('updates notification when found', async () => {
      const notification = { update: jest.fn().mockResolvedValue({}) }
      Notification.findByPk.mockResolvedValue(notification)
      const result = await notificationRepository.markAsRead(1)
      expect(notification.update).toHaveBeenCalledWith({ read: true })
      expect(result).toBe(notification)
    })

    it('returns null when notification not found', async () => {
      Notification.findByPk.mockResolvedValue(null)
      expect(await notificationRepository.markAsRead(999)).toBeNull()
    })
  })

  describe('markAllAsRead', () => {
    it('calls Notification.update for all unread', async () => {
      Notification.update.mockResolvedValue([3])
      await notificationRepository.markAllAsRead('p1')
      expect(Notification.update).toHaveBeenCalledWith(
        { read: true },
        { where: { profileId: 'p1', read: false } },
      )
    })
  })

  describe('delete', () => {
    it('destroys notification when found and returns true', async () => {
      const notification = { destroy: jest.fn().mockResolvedValue(true) }
      Notification.findByPk.mockResolvedValue(notification)
      const result = await notificationRepository.delete(1)
      expect(notification.destroy).toHaveBeenCalledWith()
      expect(result).toBe(true)
    })

    it('returns false when notification not found', async () => {
      Notification.findByPk.mockResolvedValue(null)
      expect(await notificationRepository.delete(999)).toBe(false)
    })
  })

  describe('countUnread', () => {
    it('calls Notification.count with unread filter', async () => {
      Notification.count.mockResolvedValue(5)
      const result = await notificationRepository.countUnread('p1')
      expect(Notification.count).toHaveBeenCalledWith({
        where: { profileId: 'p1', read: false },
      })
      expect(result).toBe(5)
    })
  })
})
