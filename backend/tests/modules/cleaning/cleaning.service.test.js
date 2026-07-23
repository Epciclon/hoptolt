require('../../setup');

jest.mock('../../../src/modules/cleaning/cleaning.repository');
jest.mock('../../../src/common/helpers/notification.helper', () => ({
  notifyOwnerOnWorkerAction: jest.fn().mockResolvedValue(undefined),
}));

const cleaningRepository = require('../../../src/modules/cleaning/cleaning.repository');
const cleaningService = require('../../../src/modules/cleaning/cleaning.service');
const { Profile, Cage, FarmMember, WorkerCage, Assignment, Rabbit, Notification } = require('../../../src/domain/models');

describe('CleaningService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

    describe('registerCleaning', () => {
    beforeEach(() => {
      Profile.findByPk.mockResolvedValue({ id: 'p1', fullName: 'Juan Pérez', username: 'juan', email: 'j@e.com' });
      FarmMember.findOne.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });
      Cage.findAll = jest.fn().mockResolvedValue([{ id: 1, number: 5, galponId: 1 }]);
      Assignment.findAll = jest.fn().mockResolvedValue([{ cageId: 1, rabbit: { id: 1, code: 'R001', name: 'Bunny', race: 'X', imageUrl: null } }]);
      WorkerCage.findAll = jest.fn().mockResolvedValue([]);
      cleaningRepository.create.mockResolvedValue({ id: 1, cageId: 1, toJSON: () => ({ id: 1, cageId: 1 }) });
      Notification.findAll = jest.fn().mockResolvedValue([]);
    });

    it('registers cleaning for cages', async () => {
      const result = await cleaningService.registerCleaning({ cageIds: [1] }, 1, 'p1');
      expect(result).toHaveLength(1);
    });

    it('throws when no cageIds provided', async () => {
      await expect(cleaningService.registerCleaning({ cageIds: [] }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
      await expect(cleaningService.registerCleaning({}, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when profile not found', async () => {
      Profile.findByPk.mockResolvedValue(null);
      await expect(cleaningService.registerCleaning({ cageIds: [1] }, 1, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when no galpon access', async () => {
      FarmMember.findOne.mockResolvedValue(null);
      await expect(cleaningService.registerCleaning({ cageIds: [1] }, 1, 'p1')).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws when worker tries to clean unassigned cage', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 1, role: 'worker', status: 'active' });
      WorkerCage.findAll = jest.fn().mockResolvedValue([]);
      await expect(cleaningService.registerCleaning({ cageIds: [1] }, 1, 'p1')).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws when cage not found', async () => {
      Cage.findAll = jest.fn().mockResolvedValue([]);
      await expect(cleaningService.registerCleaning({ cageIds: [1] }, 1, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getCleanings', () => {
    it('returns paginated results', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });
      cleaningRepository.findByGalponId.mockResolvedValue([{
        toJSON: () => ({ id: 1, profile: { fullName: 'Worker', username: 'w', email: 'w@e.com' } }),
      }]);
      cleaningRepository.countByGalponId.mockResolvedValue(1);

      const result = await cleaningService.getCleanings(1, 'p1', 1, 10, {});
      expect(result.data).toHaveLength(1);
    });

    it('returns empty when no galponId', async () => {
      const result = await cleaningService.getCleanings(null, 'p1');
      expect(result.data).toEqual([]);
    });
  });
});
