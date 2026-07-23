jest.mock('../../../src/modules/galpon/galpon.service');
jest.mock('../../../src/domain/models', () => ({
  Galpon: { findByPk: jest.fn() },
  Cage: { count: jest.fn() },
  Rabbit: { count: jest.fn() },
  Race: { count: jest.fn() },
  Assignment: { count: jest.fn() },
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
const galponService = require('../../../src/modules/galpon/galpon.service');
const { Galpon, Cage, Rabbit, Race, Assignment } = require('../../../src/domain/models');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const flushPromises = () => new Promise(r => setTimeout(r, 0));

const galponController = require('../../../src/modules/galpon/galpon.controller');

describe('GalponController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('registerGalpon', () => {
    it('should call registerGalpon and return 201', async () => {
      req = { body: { name: 'Galpon A', location: 'Sector 1' }, user: { id: 'user1' } };
      galponService.registerGalpon.mockResolvedValue({ id: 'g1', name: 'Galpon A' });

      await galponController.registerGalpon(req, res, next);

      expect(galponService.registerGalpon).toHaveBeenCalledWith(req.body, 'user1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getGalponById', () => {
    it('should call getGalponById and return 200', async () => {
      req = { params: { id: 'g1' } };
      galponService.getGalponById.mockResolvedValue({ id: 'g1', name: 'Galpon A' });

      await galponController.getGalponById(req, res, next);

      expect(galponService.getGalponById).toHaveBeenCalledWith('g1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getGalponByName', () => {
    it('should call getGalponByName and return 200', async () => {
      req = { params: { name: 'Galpon A' } };
      galponService.getGalponByName.mockResolvedValue({ id: 'g1', name: 'Galpon A' });

      await galponController.getGalponByName(req, res, next);

      expect(galponService.getGalponByName).toHaveBeenCalledWith('Galpon A');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getAllGalpones', () => {
    it('should return paginated galpones', async () => {
      req = { query: { page: '2', limit: '5' }, user: { id: 'user1' } };
      galponService.getAllGalpones.mockResolvedValue({
        data: [{ id: 'g1', name: 'Galpon A', memberRole: 'owner' }],
        pagination: { page: 2, limit: 5, total: 1 }
      });

      await galponController.getAllGalpones(req, res, next);

      expect(galponService.getAllGalpones).toHaveBeenCalledWith('user1', 2, 5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        galpones: expect.any(Array),
        pagination: expect.any(Object)
      }));
    });

    it('should use defaults when query params are missing', async () => {
      req = { query: {}, user: { id: 'user1' } };
      galponService.getAllGalpones.mockResolvedValue({ data: [], pagination: {} });

      await galponController.getAllGalpones(req, res, next);

      expect(galponService.getAllGalpones).toHaveBeenCalledWith('user1', 1, 10);
    });
  });

  describe('editGalpon', () => {
    it('should call editGalpon and return 200', async () => {
      req = { params: { id: 'g1' }, body: { name: 'Updated Galpon' }, user: { id: 'user1' } };
      galponService.editGalpon.mockResolvedValue({ id: 'g1', name: 'Updated Galpon' });

      await galponController.editGalpon(req, res, next);

      expect(galponService.editGalpon).toHaveBeenCalledWith('g1', { name: 'Updated Galpon' }, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteGalpon', () => {
    it('should call deleteGalpon and return 200', async () => {
      req = { params: { id: 'g1' }, user: { id: 'user1' } };
      galponService.deleteGalpon.mockResolvedValue();

      await galponController.deleteGalpon(req, res, next);

      expect(galponService.deleteGalpon).toHaveBeenCalledWith('g1', 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getActiveGalpon', () => {
    it('should call getActiveGalpon and return 200', async () => {
      req = { user: { id: 'user1' } };
      galponService.getActiveGalpon.mockResolvedValue({ id: 'g1', name: 'Galpon A' });

      await galponController.getActiveGalpon(req, res, next);

      expect(galponService.getActiveGalpon).toHaveBeenCalledWith('user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return null when no active galpon', async () => {
      req = { user: { id: 'user1' } };
      galponService.getActiveGalpon.mockResolvedValue(null);

      await galponController.getActiveGalpon(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, galpon: null });
    });
  });

  describe('setActiveGalpon', () => {
    it('should call setActiveGalpon and return 200', async () => {
      req = { params: { id: 'g1' }, user: { id: 'user1' } };
      galponService.setActiveGalpon.mockResolvedValue({ id: 'g1', name: 'Galpon A' });

      await galponController.setActiveGalpon(req, res, next);

      expect(galponService.setActiveGalpon).toHaveBeenCalledWith('g1', 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getGalponStats', () => {
    it('should return galpon stats when galpon exists', async () => {
      req = { params: { id: '1' } };
      galponService.getGalponStats.mockResolvedValue({ totalCages: 10, totalRabbits: 50, totalRaces: 5, totalAssignments: 40 });

      await galponController.getGalponStats(req, res, next);
      await flushPromises();

      expect(galponService.getGalponStats).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        stats: { totalCages: 10, totalRabbits: 50, totalRaces: 5, totalAssignments: 40 }
      });
    });

    it('should throw error when service fails', async () => {
      req = { params: { id: '1' } };
      galponService.getGalponStats.mockRejectedValue(new Error('Galpón no encontrado'));

      await galponController.getGalponStats(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
