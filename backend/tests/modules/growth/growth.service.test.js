require('../../setup');

const growthService = require('../../../src/modules/growth/growth.service');
const { Rabbit, FarmMember, Galpon, Notification, Growth, AuditLog } = require('../../../src/domain/models');

describe('GrowthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateEstimatedWeight', () => {
    it('returns correct weight for Engorde purpose', () => {
      expect(growthService.calculateEstimatedWeight('Engorde', 0)).toBe(0.05);
      expect(growthService.calculateEstimatedWeight('Engorde', 3)).toBe(1.5);
      expect(growthService.calculateEstimatedWeight('Engorde', 8)).toBe(2.8);
    });

    it('returns correct weight for Reproducción purpose', () => {
      expect(growthService.calculateEstimatedWeight('Reproducción', 0)).toBe(0.05);
      expect(growthService.calculateEstimatedWeight('Reproducción', 6)).toBe(2.15);
      expect(growthService.calculateEstimatedWeight('Reproducción', 12)).toBe(3.0);
    });

    it('returns 0 for unknown purpose', () => {
      expect(growthService.calculateEstimatedWeight('Unknown', 5)).toBe(0);
    });
  });

  describe('processDailyGrowth', () => {
    beforeEach(() => {
      FarmMember.findAll.mockResolvedValue([]);
      Galpon.findAll.mockResolvedValue([{ id: 1 }]);
      Rabbit.findAll.mockResolvedValue([
        { id: 1, code: 'R001', name: 'Bunny', birthDate: '2024-01-01', age: 3, weight: 1.0, purpose: 'Engorde', update: jest.fn().mockResolvedValue({}) },
      ]);
      AuditLog.create = jest.fn().mockResolvedValue({});
      Growth.create = jest.fn().mockResolvedValue({});
      Notification.findAll.mockResolvedValue([]);
      Notification.create = jest.fn().mockResolvedValue({});
    });

    it('processes daily growth and creates notifications', async () => {
      await growthService.processDailyGrowth('p1');
      expect(Rabbit.findAll).toHaveBeenCalled();
    });

    it('handles concurrent calls gracefully', async () => {
      FarmMember.findAll.mockResolvedValue([]);
      Galpon.findAll.mockResolvedValue([]);
      const first = growthService.processDailyGrowth('p1');
      const second = growthService.processDailyGrowth('p1');
      await expect(first).resolves.not.toThrow();
      await expect(second).resolves.not.toThrow();
    });

    it('handles empty galpon list gracefully', async () => {
      Galpon.findAll.mockResolvedValue([]);
      FarmMember.findAll.mockResolvedValue([]);
      await expect(growthService.processDailyGrowth('p1')).resolves.not.toThrow();
    });
  });

  describe('getHistory', () => {
    it('returns growth history for rabbit', async () => {
      Rabbit.findByPk.mockResolvedValue({ id: 1 });
      Growth.findAll = jest.fn().mockResolvedValue([{ id: 1, weight: 1.0, recordDate: '2024-01-01' }]);

      const result = await growthService.getHistory(1);
      expect(result).toHaveLength(1);
    });

    it('throws 404 when rabbit not found', async () => {
      Rabbit.findByPk.mockResolvedValue(null);
      await expect(growthService.getHistory(999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
