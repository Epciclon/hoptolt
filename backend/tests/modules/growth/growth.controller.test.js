jest.mock('../../../src/modules/growth/growth.service');
const growthService = require('../../../src/modules/growth/growth.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const growthController = require('../../../src/modules/growth/growth.controller');

describe('GrowthController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('getHistory', () => {
    it('should call getHistory and return 200', async () => {
      req = { params: { rabbitId: 'r1' } };
      const mockHistory = [
        { id: 1, weight: 2.5, date: '2024-01-15' },
        { id: 2, weight: 3.0, date: '2024-02-15' }
      ];
      growthService.getHistory.mockResolvedValue(mockHistory);

      await growthController.getHistory(req, res, next);

      expect(growthService.getHistory).toHaveBeenCalledWith('r1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockHistory
      });
    });

    it('should pass errors to next middleware', async () => {
      req = { params: { rabbitId: 'r1' } };
      const error = new Error('History not found');
      growthService.getHistory.mockRejectedValue(error);

      await growthController.getHistory(req, res, next);

      expect(growthService.getHistory).toHaveBeenCalledWith('r1');
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
