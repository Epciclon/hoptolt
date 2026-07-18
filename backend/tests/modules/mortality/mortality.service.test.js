require('../../setup');

jest.mock('../../../src/modules/mortality/mortality.repository');
jest.mock('../../../src/common/helpers/notification.helper', () => ({
  notifyOwnerOnWorkerAction: jest.fn().mockResolvedValue(undefined),
}));

const mortalityRepository = require('../../../src/modules/mortality/mortality.repository');
const mortalityService = require('../../../src/modules/mortality/mortality.service');
const { Profile, Rabbit, FarmMember, Reproduction, Mortality, Assignment } = require('../../../src/domain/models');

describe('MortalityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerMortality', () => {
    beforeEach(() => {
      Profile.findByPk.mockResolvedValue({ id: 'p1', fullName: 'Juan', username: 'juan', email: 'j@e.com' });
      Rabbit.findByPk.mockResolvedValue({ id: 1, code: 'R001', name: 'Bunny', galponId: 1, birthDate: '2024-01-01' });
    });

    it('registers adult mortality and frees assignment', async () => {
      Assignment.findOne = jest.fn().mockResolvedValue({ id: 1, status: 'asignado', update: jest.fn().mockResolvedValue({}) });
      mortalityRepository.create.mockResolvedValue({ id: 1, rabbitId: 1, cause: 'enfermedad', isKits: false });
      Rabbit.findByPk.mockResolvedValue({ id: 1, code: 'R001', name: 'Bunny', galponId: 1, birthDate: '2024-01-01', destroy: jest.fn().mockResolvedValue(true) });

      const result = await mortalityService.registerMortality({ rabbitId: 1, cause: 'enfermedad', observations: 'sick', deathDate: '2024-06-01', isKits: false }, 1, 'p1');
      expect(result.isKits).toBe(false);
    });

    it('registers kit mortality', async () => {
      Reproduction.findOne = jest.fn().mockResolvedValue({ id: 1, bornKits: 8, status: 'lactancia', mountDate: '2024-05-01', save: jest.fn().mockResolvedValue({}) });
      Mortality.findAll = jest.fn().mockResolvedValue([]);
      mortalityRepository.create.mockResolvedValue({ id: 1, rabbitId: 1, cause: 'born dead', isKits: true, numberOfKits: 2 });

      const result = await mortalityService.registerMortality({ rabbitId: 1, cause: 'born dead', observations: '', deathDate: '2024-06-01', isKits: true, numberOfKits: 2 }, 1, 'p1');
      expect(result.isKits).toBe(true);
    });

    it('throws when rabbit not found', async () => {
      Rabbit.findByPk.mockResolvedValue(null);
      await expect(mortalityService.registerMortality({ rabbitId: 999, cause: 'test', deathDate: '2024-06-01', isKits: false }, 1, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when rabbit not in galpon', async () => {
      Rabbit.findByPk.mockResolvedValue({ id: 1, galponId: 999 });
      await expect(mortalityService.registerMortality({ rabbitId: 1, cause: 'test', deathDate: '2024-06-01', isKits: false }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when death date is in the future', async () => {
      await expect(mortalityService.registerMortality({ rabbitId: 1, cause: 'test', deathDate: '2030-01-01', isKits: false }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when death date is before birth date', async () => {
      await expect(mortalityService.registerMortality({ rabbitId: 1, cause: 'test', deathDate: '2023-01-01', isKits: false }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when cause is "otra" without observations', async () => {
      await expect(mortalityService.registerMortality({ rabbitId: 1, cause: 'otra', observations: '', deathDate: '2024-06-01', isKits: false }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when kit mortality without valid numberOfKits', async () => {
      await expect(mortalityService.registerMortality({ rabbitId: 1, cause: 'test', deathDate: '2024-06-01', isKits: true, numberOfKits: 0 }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getMortalities', () => {
    it('returns paginated results', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });
      mortalityRepository.findByGalponId.mockResolvedValue([{ id: 1, rabbitId: 1 }]);
      mortalityRepository.countByGalponId.mockResolvedValue(1);

      const result = await mortalityService.getMortalities(1, 'p1', 1, 10, null, {});
      expect(result.data).toHaveLength(1);
    });

    it('returns empty when no galponId', async () => {
      const result = await mortalityService.getMortalities(null, 'p1');
      expect(result.data).toEqual([]);
    });
  });
});
