jest.mock('../../../src/modules/feeding/feeding.service');
const feedingService = require('../../../src/modules/feeding/feeding.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const feedingController = require('../../../src/modules/feeding/feeding.controller');

describe('FeedingController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('getFoodTypes', () => {
    it('should call getFoodTypes and return 200', async () => {
      req = { galponId: 1 };
      feedingService.getFoodTypes.mockResolvedValue(['Pellets', 'Heno', 'Vegetales']);

      await feedingController.getFoodTypes(req, res, next);

      expect(feedingService.getFoodTypes).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, foodTypes: ['Pellets', 'Heno', 'Vegetales'] });
    });
  });

  describe('registerFeeding', () => {
    it('should call registerFeeding and return 201', async () => {
      req = {
        body: { rabbitIds: [1, 2], foodType: 'Pellets', quantity: 500 },
        galponId: 1,
        user: { id: 'user1' }
      };
      feedingService.registerFeeding.mockResolvedValue([{ id: 'f1' }, { id: 'f2' }]);

      await feedingController.registerFeeding(req, res, next);

      expect(feedingService.registerFeeding).toHaveBeenCalledWith(req.body, 1, 'user1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getFeedings', () => {
    it('should return paginated feedings with filters', async () => {
      req = {
        query: { page: '2', limit: '5', startDate: '2024-01-01', cageType: 'engorda', all: 'true' },
        galponId: 1,
        user: { id: 'user1' }
      };
      feedingService.getFeedings.mockResolvedValue({
        data: [{ id: 'f1' }],
        pagination: { page: 2, limit: 5, total: 10 }
      });

      await feedingController.getFeedings(req, res, next);

      expect(feedingService.getFeedings).toHaveBeenCalledWith(
        1, 'user1', 2, 5,
        { startDate: '2024-01-01', endDate: undefined, races: undefined, profileId: undefined, cageType: 'engorda', all: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        feedings: expect.any(Array),
        pagination: expect.any(Object)
      }));
    });

    it('should use defaults when query params are missing', async () => {
      req = { query: {}, galponId: 1, user: { id: 'user1' } };
      feedingService.getFeedings.mockResolvedValue({ data: [], pagination: {} });

      await feedingController.getFeedings(req, res, next);

      expect(feedingService.getFeedings).toHaveBeenCalledWith(
        1, 'user1', 1, 10,
        { startDate: undefined, endDate: undefined, races: undefined, profileId: undefined, cageType: undefined, all: false }
      );
    });
  });
});
