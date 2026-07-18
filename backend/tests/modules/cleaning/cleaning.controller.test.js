jest.mock('../../../src/modules/cleaning/cleaning.service');
const cleaningService = require('../../../src/modules/cleaning/cleaning.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const cleaningController = require('../../../src/modules/cleaning/cleaning.controller');

describe('CleaningController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('registerCleaning', () => {
    it('should call registerCleaning and return 201', async () => {
      req = {
        body: { cageIds: [1, 2], cleaningType: 'profunda', observations: 'Limpieza general' },
        galponId: 1,
        user: { id: 'user1' }
      };
      cleaningService.registerCleaning.mockResolvedValue([{ id: 'cl1' }, { id: 'cl2' }]);

      await cleaningController.registerCleaning(req, res, next);

      expect(cleaningService.registerCleaning).toHaveBeenCalledWith(req.body, 1, 'user1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getCleanings', () => {
    it('should return paginated cleanings with filters', async () => {
      req = {
        query: { page: '1', limit: '10', startDate: '2024-01-01', cageType: 'reproducción', all: 'true' },
        galponId: 1,
        user: { id: 'user1' }
      };
      const mockData = [{ id: 'cl1', cageId: 1, cleaningType: 'profunda' }];
      cleaningService.getCleanings.mockResolvedValue({
        data: mockData,
        pagination: { page: 1, limit: 10, total: 1 }
      });

      await cleaningController.getCleanings(req, res, next);

      expect(cleaningService.getCleanings).toHaveBeenCalledWith(
        1, 'user1', 1, 10,
        { startDate: '2024-01-01', endDate: undefined, responsibleId: undefined, cageType: 'reproducción', all: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        cleanings: expect.any(Array),
        pagination: expect.any(Object)
      }));
    });

    it('should handle result.data being undefined', async () => {
      req = { query: {}, galponId: 1, user: { id: 'user1' } };
      cleaningService.getCleanings.mockResolvedValue({ cleanings: [], pagination: {} });

      await cleaningController.getCleanings(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        cleanings: expect.any(Array),
        pagination: expect.any(Object)
      }));
    });
  });
});
