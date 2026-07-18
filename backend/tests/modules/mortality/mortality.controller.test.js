jest.mock('../../../src/modules/mortality/mortality.service');
const mortalityService = require('../../../src/modules/mortality/mortality.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mortalityController = require('../../../src/modules/mortality/mortality.controller');

describe('MortalityController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('registerMortality', () => {
    it('should call registerMortality and return 201', async () => {
      req = {
        body: { rabbitId: 1, cause: 'enfermedad', notes: 'Fiebre' },
        galponId: 1,
        user: { id: 'user1' }
      };
      mortalityService.registerMortality.mockResolvedValue({ id: 'm1', rabbitId: 1 });

      await mortalityController.registerMortality(req, res, next);

      expect(mortalityService.registerMortality).toHaveBeenCalledWith(req.body, 1, 'user1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getMortalities', () => {
    it('should return paginated mortalities with filters', async () => {
      req = {
        query: {
          page: '2', limit: '5', startDate: '2024-01-01', endDate: '2024-12-31',
          causes: 'enfermedad', isKits: 'false', all: 'true'
        },
        galponId: 1,
        user: { id: 'user1' }
      };
      mortalityService.getMortalities.mockResolvedValue({
        data: [{ id: 'm1' }],
        pagination: { page: 2, limit: 5, total: 10 }
      });

      await mortalityController.getMortalities(req, res, next);

      expect(mortalityService.getMortalities).toHaveBeenCalledWith(
        1, 'user1', 2, 5, false,
        {
          startDate: '2024-01-01', endDate: '2024-12-31', races: undefined,
          causes: 'enfermedad', profileId: undefined, all: true
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        mortalities: expect.any(Array),
        pagination: expect.any(Object)
      }));
    });

    it('should handle isKits being undefined', async () => {
      req = { query: {}, galponId: 1, user: { id: 'user1' } };
      mortalityService.getMortalities.mockResolvedValue({ data: [], pagination: {} });

      await mortalityController.getMortalities(req, res, next);

      expect(mortalityService.getMortalities).toHaveBeenCalledWith(
        1, 'user1', 1, 10, null,
        {
          startDate: undefined, endDate: undefined, races: undefined,
          causes: undefined, profileId: undefined, all: false
        }
      );
    });

    it('should use defaults when query params are missing', async () => {
      req = { query: {}, galponId: 1, user: { id: 'user1' } };
      mortalityService.getMortalities.mockResolvedValue({ data: [], pagination: {} });

      await mortalityController.getMortalities(req, res, next);

      expect(mortalityService.getMortalities).toHaveBeenCalledWith(
        1, 'user1', 1, 10, null,
        {
          startDate: undefined, endDate: undefined, races: undefined,
          causes: undefined, profileId: undefined, all: false
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
