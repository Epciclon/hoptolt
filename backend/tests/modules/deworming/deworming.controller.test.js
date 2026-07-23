jest.mock('../../../src/modules/deworming/deworming.service');
jest.mock('../../../src/domain/models', () => ({
  Galpon: { findByPk: jest.fn() },
  Profile: {
    findAll: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(),
    create: jest.fn(), upsert: jest.fn(), count: jest.fn(), destroy: jest.fn(),
    update: jest.fn(), bulkCreate: jest.fn()
  },
  Op: {
    in: Symbol('in'), gte: Symbol('gte'), lte: Symbol('lte'),
    between: Symbol('between'), or: Symbol('or'), iLike: Symbol('iLike'),
    like: Symbol('like'), and: Symbol('and'), ne: Symbol('ne'),
    eq: Symbol('eq'), gt: Symbol('gt'), lt: Symbol('lt')
  }
}));
const dewormingService = require('../../../src/modules/deworming/deworming.service');
const { Galpon } = require('../../../src/domain/models');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const dewormingController = require('../../../src/modules/deworming/deworming.controller');

describe('DewormingController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('registerDeworming', () => {
    it('should call registerDeworming and return 201', async () => {
      req = { body: { rabbitIds: [1, 2], product: 'Ivermectina' }, galponId: 1, user: { id: 'user1' } };
      dewormingService.registerDeworming.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }]);

      await dewormingController.registerDeworming(req, res, next);

      expect(dewormingService.registerDeworming).toHaveBeenCalledWith(req.body, 1, 'user1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getDewormings', () => {
    it('should return paginated dewormings with filters', async () => {
      req = {
        query: { page: '1', limit: '10', startDate: '2024-01-01', races: 'Rex', all: 'true' },
        galponId: 1,
        user: { id: 'user1' }
      };
      dewormingService.getDewormings.mockResolvedValue({
        data: [{ id: 'd1' }],
        pagination: { page: 1, limit: 10, total: 1 }
      });

      await dewormingController.getDewormings(req, res, next);

      expect(dewormingService.getDewormings).toHaveBeenCalledWith(
        1, 'user1', 1, 10,
        { startDate: '2024-01-01', endDate: undefined, races: 'Rex', profileId: undefined, all: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        dewormings: expect.any(Array),
        pagination: expect.any(Object)
      }));
    });
  });

  describe('getGalponDewormingPeriod', () => {
    it('should return deworming period when galpon exists', async () => {
      req = { galponId: 1 };
      dewormingService.getGalponDewormingPeriod.mockResolvedValue(45);

      await dewormingController.getGalponDewormingPeriod(req, res, next);

      expect(dewormingService.getGalponDewormingPeriod).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, dewormingPeriod: 45 });
    });

    it('should throw error when galpon not found', async () => {
      req = { galponId: 1 };
      dewormingService.getGalponDewormingPeriod.mockRejectedValue(new Error('Galpón no encontrado.'));

      await dewormingController.getGalponDewormingPeriod(req, res, next);
      await new Promise(process.nextTick);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
