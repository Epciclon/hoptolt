jest.mock('../../../src/modules/vaccination/vaccination.service');
jest.mock('../../../src/modules/galpon/galpon.repository');
const vaccinationService = require('../../../src/modules/vaccination/vaccination.service');
const galponRepository = require('../../../src/modules/galpon/galpon.repository');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const vaccinationController = require('../../../src/modules/vaccination/vaccination.controller');

describe('VaccinationController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('registerVaccination', () => {
    it('should call registerVaccination and return 201', async () => {
      req = { body: { rabbitIds: [1, 2], vaccine: 'Mixomatosis' }, galponId: 1, user: { id: 'user1' } };
      vaccinationService.registerVaccination.mockResolvedValue([{ id: 'v1' }, { id: 'v2' }]);

      await vaccinationController.registerVaccination(req, res, next);

      expect(vaccinationService.registerVaccination).toHaveBeenCalledWith(req.body, 1, 'user1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getVaccinations', () => {
    it('should return paginated vaccinations with filters', async () => {
      req = {
        query: { page: '2', limit: '5', startDate: '2024-01-01', endDate: '2024-12-31', all: 'true' },
        galponId: 1,
        user: { id: 'user1' }
      };
      vaccinationService.getVaccinations.mockResolvedValue({
        data: [{ id: 'v1' }],
        pagination: { page: 2, limit: 5, total: 10 }
      });

      await vaccinationController.getVaccinations(req, res, next);

      expect(vaccinationService.getVaccinations).toHaveBeenCalledWith(
        1, 'user1', 2, 5,
        { startDate: '2024-01-01', endDate: '2024-12-31', races: undefined, profileId: undefined, all: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        vaccinations: expect.any(Array),
        pagination: expect.any(Object)
      }));
    });

    it('should use defaults when query params are missing', async () => {
      req = { query: {}, galponId: 1, user: { id: 'user1' } };
      vaccinationService.getVaccinations.mockResolvedValue({ data: [], pagination: {} });

      await vaccinationController.getVaccinations(req, res, next);

      expect(vaccinationService.getVaccinations).toHaveBeenCalledWith(
        1, 'user1', 1, 10,
        { startDate: undefined, endDate: undefined, races: undefined, profileId: undefined, all: false }
      );
    });
  });

  describe('getGalponVaccines', () => {
    it('should return galpon vaccines when galpon exists', async () => {
      req = { galponId: 1 };
      vaccinationService.getGalponVaccines.mockResolvedValue(['Mixomatosis', 'RHD']);

      await vaccinationController.getGalponVaccines(req, res, next);

      expect(vaccinationService.getGalponVaccines).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, vaccines: ['Mixomatosis', 'RHD'] });
    });

    it('should throw error when galpon not found', async () => {
      req = { galponId: 1 };
      vaccinationService.getGalponVaccines.mockRejectedValue(new Error('Galpón no encontrado.'));

      await vaccinationController.getGalponVaccines(req, res, next);
      await new Promise(process.nextTick);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
