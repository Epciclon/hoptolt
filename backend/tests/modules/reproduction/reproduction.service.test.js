require('../../setup');

jest.mock('../../../src/modules/reproduction/reproduction.repository');
jest.mock('../../../src/common/helpers/reproductionNotification.helper', () => ({
  notifyOwnerOnManualPhaseChange: jest.fn().mockResolvedValue(undefined),
}));

const reproductionRepository = require('../../../src/modules/reproduction/reproduction.repository');
const reproductionService = require('../../../src/modules/reproduction/reproduction.service');
const { Rabbit, Assignment, Cage, FarmMember, Galpon } = require('../../../src/domain/models');

describe('ReproductionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateEstimatedBirthDate', () => {
    it('returns date 31 days after mount date', () => {
      const result = reproductionService.calculateEstimatedBirthDate('2024-01-01');
      expect(result).toBe('2024-02-01');
    });
  });

  describe('registerReproduction', () => {
    beforeEach(() => {
      Rabbit.findByPk.mockImplementation((id) => {
        if (id === 1) return { id: 1, code: 'F001', name: 'Female', sex: 'hembra', galponId: 1, birthDate: '2023-06-01', age: 8 };
        if (id === 2) return { id: 2, code: 'M001', name: 'Male', sex: 'macho', galponId: 1, birthDate: '2023-01-01' };
        return null;
      });
      Assignment.findOne = jest.fn().mockResolvedValue({ id: 1, cageId: 1, status: 'asignado' });
      Cage.findByPk.mockResolvedValue({ id: 1, type: 'reproducción' });
      reproductionRepository.findActiveMountByFemaleId.mockResolvedValue(null);
      reproductionRepository.create.mockResolvedValue({ id: 1, femaleId: 1, maleId: 2, status: 'monta', estimatedBirthDate: '2024-02-01' });
    });

    it('creates a reproduction record', async () => {
      const result = await reproductionService.registerReproduction({ femaleId: 1, maleId: 2, mountDate: '2024-01-01' }, 1);
      expect(result.status).toBe('monta');
    });

    it('throws when female not found', async () => {
      Rabbit.findByPk.mockImplementation((id) => id === 1 ? null : {});
      await expect(reproductionService.registerReproduction({ femaleId: 1, maleId: 2, mountDate: '2024-01-01' }, 1)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when female has active mount', async () => {
      reproductionRepository.findActiveMountByFemaleId.mockResolvedValue({ id: 2, estimatedBirthDate: '2024-02-01' });
      await expect(reproductionService.registerReproduction({ femaleId: 1, maleId: 2, mountDate: '2024-01-01' }, 1)).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getAllReproductions', () => {
    it('returns paginated results', async () => {
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'p1' });
      reproductionRepository.findByGalponId.mockResolvedValue([{ id: 1 }]);
      reproductionRepository.countByGalponId.mockResolvedValue(1);

      const result = await reproductionService.getAllReproductions(1, 'p1', 1, 10, {});
      expect(result.data).toHaveLength(1);
    });

    it('returns empty when no galponId', async () => {
      const result = await reproductionService.getAllReproductions(null, 'p1');
      expect(result.data).toEqual([]);
    });
  });

  describe('editReproduction', () => {
    it('updates reproduction record', async () => {
      reproductionRepository.findById.mockResolvedValue({ id: 1, femaleId: 1, mountDate: '2024-01-01', status: 'monta', bornKits: null });
      reproductionRepository.update.mockResolvedValue({ id: 1, status: 'gestacion' });

      const result = await reproductionService.editReproduction(1, { mountDate: '2024-01-02' }, 'p1');
      expect(reproductionRepository.update).toHaveBeenCalled();
    });

    it('throws 404 when not found', async () => {
      reproductionRepository.findById.mockResolvedValue(null);
      await expect(reproductionService.editReproduction(999, {}, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deleteReproduction', () => {
    it('deletes reproduction record', async () => {
      reproductionRepository.findById.mockResolvedValue({ id: 1 });
      reproductionRepository.delete = jest.fn().mockResolvedValue(true);

      await reproductionService.deleteReproduction(1);
      expect(reproductionRepository.delete).toHaveBeenCalled();
    });

    it('throws 404 when not found', async () => {
      reproductionRepository.findById.mockResolvedValue(null);
      await expect(reproductionService.deleteReproduction(999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getReproductionCalendar', () => {
    it('returns births calendar', async () => {
      reproductionRepository.findByMonthAndGalpon.mockResolvedValue([{ id: 1 }]);
      const result = await reproductionService.getReproductionCalendar(1, 2024, 1, 'births');
      expect(result).toHaveLength(1);
    });
  });

  describe('startMating', () => {
    it('creates mating record', async () => {
      Rabbit.findByPk.mockImplementation((id) => {
        if (id === 1) return { id: 1, code: 'M001', sex: 'macho', race: 'New Zealand' };
        if (id === 2) return { id: 2, code: 'F001', sex: 'hembra', race: 'New Zealand' };
        return null;
      });
      reproductionRepository.findAll = jest.fn().mockResolvedValue([]);
      reproductionRepository.create = jest.fn().mockResolvedValue({ id: 1, status: 'monta' });

      const result = await reproductionService.startMating({ maleId: 1, femaleId: 2 }, 1, 'p1');
      expect(result.status).toBe('monta');
    });

    it('throws when sexes are incorrect', async () => {
      Rabbit.findByPk.mockImplementation((id) => {
        if (id === 1) return { id: 1, code: 'M001', sex: 'hembra', race: 'New Zealand' };
        if (id === 2) return { id: 2, code: 'F001', sex: 'macho', race: 'New Zealand' };
        return null;
      });
      await expect(reproductionService.startMating({ maleId: 1, femaleId: 2 }, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('finishMating', () => {
    it('updates status to gestacion', async () => {
      reproductionRepository.findById.mockResolvedValue({ id: 1, galponId: 1, status: 'monta', update: jest.fn() });
      reproductionRepository.update.mockResolvedValue({ id: 1, status: 'gestacion' });

      const result = await reproductionService.finishMating(1, 1, 'p1');
      expect(result.status).toBe('gestacion');
    });

    it('throws when status is not monta', async () => {
      reproductionRepository.findById.mockResolvedValue({ id: 1, galponId: 1, status: 'gestacion' });
      await expect(reproductionService.finishMating(1, 1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('registerBirth', () => {
    it('registers birth and updates status', async () => {
      reproductionRepository.findById.mockResolvedValue({ id: 1, galponId: 1, status: 'gestacion', bornKits: null });
      reproductionRepository.update.mockResolvedValue({ id: 1, status: 'lactancia' });

      const result = await reproductionService.registerBirth(1, 1, { bornKits: 6, actualBirthDate: '2024-02-01' }, 'p1');
      expect(result.status).toBe('lactancia');
    });
  });

  describe('cancelReproduction', () => {
    it('cancels with fail action', async () => {
      reproductionRepository.findById.mockResolvedValue({ id: 1, galponId: 1, status: 'monta' });
      reproductionRepository.update.mockResolvedValue({ id: 1, status: 'fallido' });

      const result = await reproductionService.cancelReproduction(1, 1, { reason: 'No progress', action: 'fail' }, 'p1');
      expect(result.status).toBe('fallido');
    });

    it('deletes with delete action', async () => {
      reproductionRepository.findById.mockResolvedValue({ id: 1, galponId: 1, status: 'monta' });
      reproductionRepository.delete = jest.fn().mockResolvedValue(true);

      const result = await reproductionService.cancelReproduction(1, 1, { action: 'delete' }, 'p1');
      expect(result.deleted).toBe(true);
    });
  });

  describe('getReproductionById', () => {
    it('returns reproduction with details', async () => {
      reproductionRepository.findByIdWithDetails.mockResolvedValue({ id: 1, female: { code: 'F001' } });
      const result = await reproductionService.getReproductionById(1);
      expect(result.female.code).toBe('F001');
    });

    it('throws 404 when not found', async () => {
      reproductionRepository.findByIdWithDetails.mockResolvedValue(null);
      await expect(reproductionService.getReproductionById(999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
