require('../../setup');

jest.mock('../../../src/modules/genealogy/genealogy.repository');

const genealogyRepository = require('../../../src/modules/genealogy/genealogy.repository');
const genealogyService = require('../../../src/modules/genealogy/genealogy.service');
const { Rabbit } = require('../../../src/domain/models');

describe('GenealogyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerGenealogy', () => {
    beforeEach(() => {
      Rabbit.findByPk.mockImplementation((id, opts) => {
        const rabbits = {
          1: { id: 1, code: 'R001', name: 'Child', sex: 'hembra', age: 2, race: 'New Zealand', galponId: 1 },
          2: { id: 2, code: 'R002', name: 'Father', sex: 'macho', age: 14, race: 'New Zealand', galponId: 1 },
          3: { id: 3, code: 'R003', name: 'Mother', sex: 'hembra', age: 12, race: 'New Zealand', galponId: 1 },
        };
        return rabbits[id] || null;
      });
      genealogyRepository.findByRabbitId.mockResolvedValue(null);
      genealogyRepository.findAll.mockResolvedValue([]);
      genealogyRepository.findChildrenByMother.mockResolvedValue([]);
      genealogyRepository.findChildrenByFather.mockResolvedValue([]);
      genealogyRepository.create = jest.fn().mockResolvedValue({ id: 1, rabbitId: 1, fatherId: 2, motherId: 3, galponId: 1, toJSON: () => ({ id: 1, rabbitId: 1, fatherId: 2, motherId: 3, galponId: 1 }) });
    });

    it('creates genealogy record', async () => {
      const result = await genealogyService.registerGenealogy({ rabbitId: 1, fatherId: 2, motherId: 3 }, 1);
      expect(result.rabbitId).toBe(1);
      expect(genealogyRepository.create).toHaveBeenCalled();
    });

    it('throws when rabbit not found', async () => {
      Rabbit.findByPk.mockResolvedValue(null);
      await expect(genealogyService.registerGenealogy({ rabbitId: 999, fatherId: 2, motherId: 3 }, 1)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when rabbit is its own father', async () => {
      await expect(genealogyService.registerGenealogy({ rabbitId: 1, fatherId: 1, motherId: 3 }, 1)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when rabbit is its own mother', async () => {
      await expect(genealogyService.registerGenealogy({ rabbitId: 1, fatherId: 2, motherId: 1 }, 1)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('updates existing genealogy if already exists', async () => {
      genealogyRepository.findByRabbitId.mockResolvedValue({ id: 1, rabbitId: 1, fatherId: null, motherId: null, toJSON: () => ({ id: 1, rabbitId: 1, fatherId: 2, motherId: 3 }) });
      genealogyRepository.update = jest.fn().mockResolvedValue({ id: 1, rabbitId: 1, fatherId: 2, motherId: 3, toJSON: () => ({ id: 1, rabbitId: 1, fatherId: 2, motherId: 3 }) });

      const result = await genealogyService.registerGenealogy({ rabbitId: 1, fatherId: 2, motherId: 3 }, 1);
      expect(genealogyRepository.update).toHaveBeenCalled();
    });
  });

  describe('checkConsanguinity', () => {
    it('returns true for same IDs', async () => {
      const result = await genealogyService.checkConsanguinity(1, 1);
      expect(result).toBe(true);
    });

    it('returns false for unrelated rabbits', async () => {
      genealogyRepository.findByRabbitId.mockImplementation((id) => {
        if (id === 1) return { id: 1, rabbitId: 1, fatherId: null, motherId: null };
        if (id === 2) return { id: 2, rabbitId: 2, fatherId: null, motherId: null };
        return null;
      });
      const result = await genealogyService.checkConsanguinity(1, 2);
      expect(result).toBe(false);
    });
  });

  describe('getGenealogy', () => {
    it('returns genealogy when found', async () => {
      genealogyRepository.findByRabbitId.mockResolvedValue({ id: 1, rabbitId: 1 });
      const result = await genealogyService.getGenealogy(1);
      expect(result.rabbitId).toBe(1);
    });

    it('throws 404 when not found', async () => {
      genealogyRepository.findByRabbitId.mockResolvedValue(null);
      await expect(genealogyService.getGenealogy(999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getAllGenealogies', () => {
    it('returns genealogies for galpon', async () => {
      genealogyRepository.findByGalponId.mockResolvedValue([{ id: 1, rabbitId: 1 }]);
      const result = await genealogyService.getAllGenealogies(1);
      expect(result).toHaveLength(1);
    });

    it('returns empty array when no galponId', async () => {
      const result = await genealogyService.getAllGenealogies(null);
      expect(result).toEqual([]);
    });
  });

  describe('editGenealogy', () => {
    it('updates genealogy', async () => {
      Rabbit.findByPk.mockImplementation((id) => {
        const rabbits = {
          1: { id: 1, code: 'R001', name: 'Child', sex: 'hembra', age: 2, race: 'New Zealand', galponId: 1 },
          2: { id: 2, code: 'R002', name: 'Father', sex: 'macho', age: 14, race: 'New Zealand', galponId: 1 },
          3: { id: 3, code: 'R003', name: 'Mother', sex: 'hembra', age: 12, race: 'New Zealand', galponId: 1 },
        };
        return rabbits[id] || null;
      });
      genealogyRepository.findAll.mockResolvedValue([]);
      genealogyRepository.findChildrenByMother.mockResolvedValue([]);
      genealogyRepository.findChildrenByFather.mockResolvedValue([]);
      genealogyRepository.findByRabbitId.mockResolvedValue({ id: 1, rabbitId: 1, fatherId: null, motherId: null, save: jest.fn().mockResolvedValue({ toJSON: () => ({ id: 1, rabbitId: 1, fatherId: 2, motherId: 3 }) }), changed: jest.fn() });
      const result = await genealogyService.editGenealogy(1, { fatherId: 2, motherId: 3 });
      expect(result.rabbitId).toBe(1);
    });

    it('throws 404 when not found', async () => {
      genealogyRepository.findByRabbitId.mockResolvedValue(null);
      await expect(genealogyService.editGenealogy(999, {})).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getGenealogyTree', () => {
    it('returns tree structure', async () => {
      Rabbit.findByPk.mockResolvedValue({ id: 1, code: 'R001', name: 'Root', sex: 'hembra', age: 2, weight: 1.0, race: 'X', imageUrl: null });
      genealogyRepository.findByRabbitId.mockResolvedValue(null);

      const result = await genealogyService.getGenealogyTree(1, 2);
      expect(result.id).toBe(1);
      expect(result.code).toBe('R001');
    });

    it('throws 404 when rabbit not found', async () => {
      Rabbit.findByPk.mockResolvedValue(null);
      await expect(genealogyService.getGenealogyTree(999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
