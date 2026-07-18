require('../../setup');

jest.mock('../../../src/modules/deworming/deworming.repository');
jest.mock('../../../src/common/helpers/notification.helper', () => ({
  notifyOwnerOnWorkerAction: jest.fn().mockResolvedValue(undefined),
}));

const dewormingRepository = require('../../../src/modules/deworming/deworming.repository');
const dewormingService = require('../../../src/modules/deworming/deworming.service');
const { Rabbit, Assignment, Galpon, FarmMember, Reproduction } = require('../../../src/domain/models');

describe('DewormingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerDeworming', () => {
    beforeEach(() => {
      Galpon.findByPk.mockResolvedValue({ id: 1, dewormingPeriod: 30 });
      Rabbit.findByPk.mockResolvedValue({ id: 1, code: 'R001', name: 'Bunny', galponId: 1 });
      Assignment.findOne = jest.fn().mockResolvedValue({ id: 1, status: 'asignado' });
      Reproduction.findOne = jest.fn().mockResolvedValue(null);
      dewormingRepository.findLastDewormingByRabbit.mockResolvedValue(null);
      dewormingRepository.create.mockResolvedValue({ id: 1, rabbitId: 1 });
    });

    it('registers deworming for valid rabbits', async () => {
      const result = await dewormingService.registerDeworming({ rabbitIds: [1] }, 1, 'p1');
      expect(result).toHaveLength(1);
      expect(dewormingRepository.create).toHaveBeenCalled();
    });

    it('throws when galpon not found', async () => {
      Galpon.findByPk.mockResolvedValue(null);
      await expect(dewormingService.registerDeworming({ rabbitIds: [1] }, 999, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when rabbit does not exist', async () => {
      Rabbit.findByPk.mockResolvedValue(null);
      await expect(dewormingService.registerDeworming({ rabbitIds: [1] }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when rabbit is not assigned', async () => {
      Assignment.findOne = jest.fn().mockResolvedValue(null);
      await expect(dewormingService.registerDeworming({ rabbitIds: [1] }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when rabbit is lactating', async () => {
      Reproduction.findOne = jest.fn().mockResolvedValue({ id: 1, status: 'lactancia' });
      await expect(dewormingService.registerDeworming({ rabbitIds: [1] }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getDewormings', () => {
    it('returns paginated results', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      dewormingRepository.findByGalponId.mockResolvedValue([{ id: 1 }]);
      dewormingRepository.countByGalponId.mockResolvedValue(1);

      const result = await dewormingService.getDewormings(1, 'p1', 1, 10, {});
      expect(result.data).toHaveLength(1);
    });

    it('returns empty when no galponId', async () => {
      const result = await dewormingService.getDewormings(null, 'p1');
      expect(result.data).toEqual([]);
    });
  });

  describe('getDewormingsByRabbit', () => {
    it('returns dewormings by rabbit', async () => {
      dewormingRepository.findByRabbitId.mockResolvedValue([{ id: 1, dewormingDate: '2024-01-01' }]);
      const result = await dewormingService.getDewormingsByRabbit(1);
      expect(result).toHaveLength(1);
    });
  });
});
