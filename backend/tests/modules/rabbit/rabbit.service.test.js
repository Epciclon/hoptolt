require('../../setup');

jest.mock('../../../src/modules/rabbit/rabbit.repository');
jest.mock('../../../src/modules/race/race.repository');
jest.mock('../../../src/modules/growth/growth.service', () => ({
  rebuildGrowthHistory: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/common/helpers/names.helper', () => ({
  generateRandomName: jest.fn((sex) => (sex === 'hembra' ? 'Luna' : 'Max')),
}));

jest.mock('node:crypto', () => ({
  randomInt: jest.fn((max) => 42),
}));

const rabbitRepository = require('../../../src/modules/rabbit/rabbit.repository');
const raceRepository = require('../../../src/modules/race/race.repository');
const growthService = require('../../../src/modules/growth/growth.service');
const rabbitService = require('../../../src/modules/rabbit/rabbit.service');
const { FarmMember, Growth, Assignment } = require('../../../src/domain/models');

describe('RabbitService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCode', () => {
    it('generates unique code with prefix from race', async () => {
      raceRepository.findByName.mockResolvedValue({ id: 1, name: 'New Zealand' });
      rabbitRepository.findByGalpon
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const code = await rabbitService.generateCode('New Zealand', 1);
      expect(code).toMatch(/^NZ042$/);
    });

    it('reuses prefix from existing rabbits of same race', async () => {
      rabbitRepository.findByGalpon
        .mockResolvedValueOnce([{ code: 'NZ045' }])
        .mockResolvedValueOnce([]);

      const code = await rabbitService.generateCode('New Zealand', 1);
      expect(code).toMatch(/^NZ042$/);
    });
  });

  describe('calculateAge', () => {
    it('returns 0 for future birth date', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const age = rabbitService.calculateAge(future.toISOString());
      expect(age).toBe(0);
    });

    it('returns correct months for past date', () => {
      const past = new Date();
      past.setMonth(past.getMonth() - 5);
      const age = rabbitService.calculateAge(past.toISOString());
      expect(age).toBeGreaterThanOrEqual(4);
      expect(age).toBeLessThanOrEqual(6);
    });
  });

  describe('registerRabbit', () => {
    beforeEach(() => {
      FarmMember.findOne.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });
      raceRepository.findByName.mockResolvedValue({ id: 1, name: 'New Zealand' });
      rabbitRepository.findByGalpon.mockResolvedValue([]);
      rabbitRepository.create.mockResolvedValue({ id: 1, code: 'NZ001', weight: 1.0 });
      Growth.create = jest.fn().mockResolvedValue({ id: 1 });
    });

    it('creates rabbit with generated code and initial growth record', async () => {
      await rabbitService.registerRabbit(
        { name: 'Bunny', race: 'New Zealand', sex: 'macho', birthDate: '2024-01-01', weight: 1.0, purpose: 'Engorde', imageUrl: null },
        1, 'p1'
      );
      expect(rabbitRepository.create).toHaveBeenCalled();
      expect(growthService.rebuildGrowthHistory).toHaveBeenCalled();
    });

    it('throws error when race does not exist', async () => {
      raceRepository.findByName.mockResolvedValue(null);
      await expect(rabbitService.registerRabbit(
        { name: 'Bunny', race: 'Nonexistent', sex: 'macho', birthDate: '2024-01-01', weight: 1.0, purpose: 'Engorde', imageUrl: null },
        1, 'p1'
      )).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws error when no galpon access', async () => {
      FarmMember.findOne.mockResolvedValue(null);
      await expect(rabbitService.registerRabbit(
        { name: 'Bunny', race: 'New Zealand', sex: 'macho', birthDate: '2024-01-01', weight: 1.0, purpose: 'Engorde', imageUrl: null },
        1, 'p1'
      )).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('getRabbit', () => {
    it('returns rabbit when found and accessible', async () => {
      rabbitRepository.findById.mockResolvedValue({ id: 1, galponId: 1 });
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      const result = await rabbitService.getRabbit(1, 'p1');
      expect(result.id).toBe(1);
    });

    it('throws 404 when not found', async () => {
      rabbitRepository.findById.mockResolvedValue(null);
      await expect(rabbitService.getRabbit(999, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getAllRabbits', () => {
    it('returns paginated results', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      rabbitRepository.findByGalpon.mockResolvedValue([{ id: 1, toJSON: () => ({ id: 1 }) }]);
      rabbitRepository.countByGalpon.mockResolvedValue(1);
      jest.isolateModules(() => {
        jest.mock('../../../src/modules/reproduction/reproduction.repository', () => ({
          findLactatingFemaleIds: jest.fn().mockResolvedValue(new Set()),
        }));
      });
      const result = await rabbitService.getAllRabbits(1, 'p1', {}, 1, 12);
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toBeDefined();
    });

    it('returns empty when no galponId', async () => {
      const result = await rabbitService.getAllRabbits(null, 'p1');
      expect(result.data).toEqual([]);
    });
  });

  describe('editRabbit', () => {
    const mockRabbit = { id: 1, galponId: 1, weight: 1.0, birthDate: '2024-01-01', update: jest.fn().mockResolvedValue({}) };

    beforeEach(() => {
      rabbitRepository.findById.mockResolvedValue(mockRabbit);
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      rabbitRepository.update.mockResolvedValue(mockRabbit);
    });

    it('updates rabbit and creates growth record on weight change', async () => {
      rabbitRepository.update = jest.fn().mockResolvedValue({ id: 1, weight: 2.0 });

      await rabbitService.editRabbit(1, { weight: 2.0 }, 'p1');
      expect(rabbitRepository.update).toHaveBeenCalled();
    });

    it('rebuilds growth history when purpose or birthDate changes', async () => {
      Assignment.findOne = jest.fn().mockResolvedValue(null);
      rabbitRepository.update = jest.fn().mockResolvedValue({ id: 1, purpose: 'Reproducción', birthDate: '2024-02-01' });

      await rabbitService.editRabbit(1, { birthDate: '2024-02-01' }, 'p1');
      expect(growthService.rebuildGrowthHistory).toHaveBeenCalled();
    });
  });

  describe('deleteRabbit', () => {
    it('soft-deletes rabbit', async () => {
      rabbitRepository.findById.mockResolvedValue({ id: 1, galponId: 1 });
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      Assignment.count = jest.fn().mockResolvedValue(0);
      rabbitRepository.delete = jest.fn().mockResolvedValue(true);

      await rabbitService.deleteRabbit(1, 'p1');
      expect(rabbitRepository.delete).toHaveBeenCalled();
    });

    it('throws error when rabbit is assigned', async () => {
      rabbitRepository.findById.mockResolvedValue({ id: 1, galponId: 1 });
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      Assignment.count = jest.fn().mockResolvedValue(1);

      await expect(rabbitService.deleteRabbit(1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getPotentialFathers', () => {
    it('returns males >= 4 months', async () => {
      FarmMember.findOne.mockResolvedValue({ id: 1, status: 'active' });
      rabbitRepository.findByGalponAndSexAndMinAge.mockResolvedValue([{ id: 1, sex: 'macho', age: 6 }]);
      const result = await rabbitService.getPotentialFathers(1, 'p1');
      expect(result).toHaveLength(1);
    });
  });

  describe('suggestName', () => {
    it('returns generated name for sex', async () => {
      await expect(rabbitService.suggestName('hembra')).resolves.toBe('Luna');
      await expect(rabbitService.suggestName('macho')).resolves.toBe('Max');
    });

    it('defaults to macho for invalid sex', async () => {
      await expect(rabbitService.suggestName('unknown')).resolves.toBe('Max');
    });
  });
});
