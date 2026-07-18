jest.mock('../../../src/modules/reproduction/reproduction.service');
jest.mock('../../../src/domain/models', () => ({
  Rabbit: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
    destroy: jest.fn(),
    update: jest.fn(),
    bulkCreate: jest.fn()
  },
  Assignment: {
    findAll: jest.fn(),
    findOne: jest.fn()
  },
  Cage: {
    findAll: jest.fn(),
    findOne: jest.fn()
  },
  Reproduction: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn()
  },
  FarmMember: { findAll: jest.fn(), findOne: jest.fn() },
  Galpon: { findByPk: jest.fn() },
  WorkerCage: { findAll: jest.fn() },
  Op: {
    in: Symbol('in'), gte: Symbol('gte'), lte: Symbol('lte'),
    between: Symbol('between'), or: Symbol('or'), iLike: Symbol('iLike'),
    like: Symbol('like'), and: Symbol('and'), ne: Symbol('ne'),
    eq: Symbol('eq'), gt: Symbol('gt'), lt: Symbol('lt')
  }
}));
const reproductionService = require('../../../src/modules/reproduction/reproduction.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const flushPromises = () => new Promise(r => setTimeout(r, 0));

const reproductionController = require('../../../src/modules/reproduction/reproduction.controller');
const { Assignment, Rabbit, Cage, Galpon } = require('../../../src/domain/models');

describe('ReproductionController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('registerReproduction', () => {
    it('should call registerReproduction and return 201', async () => {
      req = { body: { maleId: 1, femaleId: 2 }, galponId: 1 };
      reproductionService.registerReproduction.mockResolvedValue({ id: 'rep1' });

      await reproductionController.registerReproduction(req, res, next);

      expect(reproductionService.registerReproduction).toHaveBeenCalledWith(req.body, 1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getAvailableMalesForMating', () => {
    it('should call getAvailableMalesForMating and return 200', async () => {
      req = { galponId: 1 };
      reproductionService.getAvailableMalesForMating.mockResolvedValue([{ id: 1 }]);

      await reproductionController.getAvailableMalesForMating(req, res, next);

      expect(reproductionService.getAvailableMalesForMating).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getAvailableFemalesForMating', () => {
    it('should call getAvailableFemalesForMating and return 200', async () => {
      req = { galponId: 1, params: { maleId: '2' } };
      reproductionService.getAvailableFemalesForMating.mockResolvedValue([{ id: 3 }]);

      await reproductionController.getAvailableFemalesForMating(req, res, next);

      expect(reproductionService.getAvailableFemalesForMating).toHaveBeenCalledWith(1, '2');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('startMating', () => {
    it('should call startMating and return 201', async () => {
      req = { body: { maleId: 1, femaleId: 2 }, galponId: 1, user: { id: 'user1' } };
      reproductionService.startMating.mockResolvedValue({ id: 'rep1' });

      await reproductionController.startMating(req, res, next);

      expect(reproductionService.startMating).toHaveBeenCalledWith(req.body, 1, 'user1');
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('finishMating', () => {
    it('should call finishMating and return 200', async () => {
      req = { params: { id: 'rep1' }, galponId: 1, user: { id: 'user1' } };
      reproductionService.finishMating.mockResolvedValue({ id: 'rep1' });

      await reproductionController.finishMating(req, res, next);

      expect(reproductionService.finishMating).toHaveBeenCalledWith('rep1', 1, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getReproductionByFemaleId', () => {
    it('should call getReproductionByFemaleId and return 200', async () => {
      req = { params: { femaleId: '2' } };
      reproductionService.getReproductionByFemaleId.mockResolvedValue([{ id: 'rep1' }]);

      await reproductionController.getReproductionByFemaleId(req, res, next);

      expect(reproductionService.getReproductionByFemaleId).toHaveBeenCalledWith('2');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getAllReproductions', () => {
    it('should return paginated reproductions with filters', async () => {
      req = {
        query: { page: '1', limit: '10', startDate: '2024-01-01', endDate: '2024-12-31', all: 'true' },
        galponId: 1,
        user: { id: 'user1' }
      };
      reproductionService.getAllReproductions.mockResolvedValue({
        data: [{ id: 'rep1' }],
        pagination: { page: 1, limit: 10, total: 1 }
      });

      await reproductionController.getAllReproductions(req, res, next);

      expect(reproductionService.getAllReproductions).toHaveBeenCalledWith(
        1, 'user1', 1, 10,
        { startDate: '2024-01-01', endDate: '2024-12-31', races: undefined, status: undefined, profileId: undefined, all: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        reproductions: expect.any(Array),
        pagination: expect.any(Object)
      }));
    });

    it('should use defaults when query params are missing', async () => {
      req = { query: {}, galponId: 1, user: { id: 'user1' } };
      reproductionService.getAllReproductions.mockResolvedValue({ data: [], pagination: {} });

      await reproductionController.getAllReproductions(req, res, next);

      expect(reproductionService.getAllReproductions).toHaveBeenCalledWith(
        1, 'user1', 1, 10,
        { startDate: undefined, endDate: undefined, races: undefined, status: undefined, profileId: undefined, all: false }
      );
    });
  });

  describe('getReproductionFemales', () => {
    it('should return assigned females in reproduction cages', async () => {
      req = { galponId: 1 };
      Assignment.findAll.mockResolvedValue([
        {
          rabbit: { id: 1, code: 'R1', name: 'Luna', race: 'Rex', imageUrl: null, age: 12, weight: 3.5 },
          cage: { id: 1, number: 'C1', type: 'reproducción' }
        }
      ]);

      await reproductionController.getReproductionFemales(req, res, next);

      expect(Assignment.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, females: expect.any(Array) }));
    });
  });

  describe('getReproductionMales', () => {
    it('should return assigned males', async () => {
      req = { galponId: 1 };
      Assignment.findAll.mockResolvedValue([
        {
          rabbit: { id: 2, code: 'R2', name: 'Thor', race: 'Mini Lop', imageUrl: null, age: 10, weight: 4.0 },
          cage: { id: 2, number: 'C2', type: 'individual' }
        }
      ]);

      await reproductionController.getReproductionMales(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, males: expect.any(Array) }));
    });
  });

  describe('editReproduction', () => {
    it('should call editReproduction and return 200', async () => {
      req = { params: { id: 'rep1' }, body: { status: 'gestación' }, user: { id: 'user1' } };
      reproductionService.editReproduction.mockResolvedValue({ id: 'rep1' });

      await reproductionController.editReproduction(req, res, next);

      expect(reproductionService.editReproduction).toHaveBeenCalledWith('rep1', { status: 'gestación' }, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteReproduction', () => {
    it('should call deleteReproduction and return 200', async () => {
      req = { params: { id: 'rep1' } };
      reproductionService.deleteReproduction.mockResolvedValue();

      await reproductionController.deleteReproduction(req, res, next);

      expect(reproductionService.deleteReproduction).toHaveBeenCalledWith('rep1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getReproductionCalendar', () => {
    it('should return calendar grouped by date', async () => {
      req = {
        galponId: 1,
        user: { id: 'user1' },
        query: { year: '2024', month: '6', type: 'births' }
      };
      reproductionService.getReproductionCalendar.mockResolvedValue([]);
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'user1' });

      await reproductionController.getReproductionCalendar(req, res, next);
      await flushPromises();

      expect(reproductionService.getReproductionCalendar).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, calendar: expect.any(Object) }));
    });
  });

  describe('getReproductionByDay', () => {
    it('should return reproductions for a specific day', async () => {
      req = {
        galponId: 1,
        user: { id: 'user1' },
        query: { year: '2024', month: '6', day: '15' }
      };
      reproductionService.getReproductionByDay.mockResolvedValue([]);
      Galpon.findByPk.mockResolvedValue({ id: 1, profileId: 'user1' });

      await reproductionController.getReproductionByDay(req, res, next);
      await flushPromises();

      expect(reproductionService.getReproductionByDay).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getReproductionById', () => {
    it('should return reproduction when found', async () => {
      req = { params: { id: 'rep1' } };
      reproductionService.getReproductionById.mockResolvedValue({ id: 'rep1', status: 'monta' });

      await reproductionController.getReproductionById(req, res, next);

      expect(reproductionService.getReproductionById).toHaveBeenCalledWith('rep1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when not found', async () => {
      req = { params: { id: 'rep1' } };
      reproductionService.getReproductionById.mockResolvedValue(null);

      await reproductionController.getReproductionById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: expect.any(String) });
    });
  });

  describe('registerBirth', () => {
    it('should call registerBirth and return 200', async () => {
      req = { params: { id: 'rep1' }, galponId: 1, body: { kits: 6 }, user: { id: 'user1' } };
      reproductionService.registerBirth.mockResolvedValue({ id: 'rep1' });

      await reproductionController.registerBirth(req, res, next);

      expect(reproductionService.registerBirth).toHaveBeenCalledWith('rep1', 1, { kits: 6 }, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('cancelReproduction', () => {
    it('should call cancelReproduction and return 200', async () => {
      req = { params: { id: 'rep1' }, galponId: 1, body: { reason: 'No viable' }, user: { id: 'user1' } };
      reproductionService.cancelReproduction.mockResolvedValue({ id: 'rep1' });

      await reproductionController.cancelReproduction(req, res, next);

      expect(reproductionService.cancelReproduction).toHaveBeenCalledWith('rep1', 1, { reason: 'No viable' }, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('finishLactation', () => {
    it('should call finishLactation and return 200', async () => {
      req = { params: { id: 'rep1' }, galponId: 1, user: { id: 'user1' } };
      reproductionService.finishLactation.mockResolvedValue({ id: 'rep1' });

      await reproductionController.finishLactation(req, res, next);

      expect(reproductionService.finishLactation).toHaveBeenCalledWith('rep1', 1, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
