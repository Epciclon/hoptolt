require('../../setup');

jest.mock('../../../src/modules/feeding/feeding.repository');
jest.mock('../../../src/modules/galpon/galpon.repository');
jest.mock('../../../src/common/helpers/notification.helper', () => ({
  notifyOwnerOnWorkerAction: jest.fn().mockResolvedValue(undefined),
}));

const feedingRepository = require('../../../src/modules/feeding/feeding.repository');
const galponRepository = require('../../../src/modules/galpon/galpon.repository');
const feedingService = require('../../../src/modules/feeding/feeding.service');
const { Cage, Assignment, Rabbit, FarmMember } = require('../../../src/domain/models');

describe('FeedingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFoodTypes', () => {
    it('returns food types from galpon', async () => {
      galponRepository.findById.mockResolvedValue({ id: 1, foodTypes: ['pellets', 'heno'] });
      const result = await feedingService.getFoodTypes(1);
      expect(result).toEqual(['pellets', 'heno']);
    });

    it('throws when galpon not found', async () => {
      galponRepository.findById.mockResolvedValue(null);
      await expect(feedingService.getFoodTypes(999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('registerFeeding', () => {
    beforeEach(() => {
      Cage.findByPk.mockResolvedValue({ id: 1, number: 5, galponId: 1 });
      Assignment.findAll = jest.fn().mockResolvedValue([{ rabbit: { id: 1, code: 'R001', name: 'Bunny', race: 'X', imageUrl: null } }]);
      feedingRepository.countByUniqueAttributes.mockResolvedValue(0);
      feedingRepository.create.mockResolvedValue({ id: 1, cageId: 1, foodTypes: ['pellets'], shift: 'mañana' });
    });

    it('registers feeding for a cage', async () => {
      const result = await feedingService.registerFeeding({ cageIds: [1], foodTypes: ['pellets'], shift: 'mañana' }, 1, 'p1');
      expect(result).toHaveLength(1);
      expect(feedingRepository.create).toHaveBeenCalled();
    });

    it('auto-detects shift when not provided', async () => {
      const result = await feedingService.registerFeeding({ cageIds: [1], foodTypes: ['pellets'] }, 1, 'p1');
      expect(result).toHaveLength(1);
    });

    it('throws when cage not found', async () => {
      Cage.findByPk.mockResolvedValue(null);
      await expect(feedingService.registerFeeding({ cageIds: [999], foodTypes: ['pellets'], shift: 'mañana' }, 1, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when cage does not belong to galpon', async () => {
      Cage.findByPk.mockResolvedValue({ id: 1, galponId: 999 });
      await expect(feedingService.registerFeeding({ cageIds: [1], foodTypes: ['pellets'], shift: 'mañana' }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when cage has no assigned rabbits', async () => {
      Assignment.findAll = jest.fn().mockResolvedValue([]);
      await expect(feedingService.registerFeeding({ cageIds: [1], foodTypes: ['pellets'], shift: 'mañana' }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('requires justification for duplicate feeding in same shift', async () => {
      feedingRepository.countByUniqueAttributes.mockResolvedValue(1);
      await expect(feedingService.registerFeeding({ cageIds: [1], foodTypes: ['pellets'], shift: 'mañana' }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getFeedings', () => {
    it('returns paginated results', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      feedingRepository.findByGalponId.mockResolvedValue([{ id: 1 }]);
      feedingRepository.countByGalponId.mockResolvedValue(1);

      const result = await feedingService.getFeedings(1, 'p1', 1, 10, {});
      expect(result.data).toHaveLength(1);
    });

    it('returns empty when no galponId', async () => {
      const result = await feedingService.getFeedings(null, 'p1');
      expect(result.data).toEqual([]);
    });
  });
});
