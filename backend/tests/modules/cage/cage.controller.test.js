jest.mock('../../../src/modules/cage/cage.service');
const cageService = require('../../../src/modules/cage/cage.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const cageController = require('../../../src/modules/cage/cage.controller');

describe('CageController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('registerCage', () => {
    it('should call registerCage and return 201', async () => {
      req = { body: { number: 'C1', type: 'reproducción' }, user: { id: 'user1' } };
      cageService.registerCage.mockResolvedValue({ id: 'c1', number: 'C1' });

      await cageController.registerCage(req, res, next);

      expect(cageService.registerCage).toHaveBeenCalledWith(req.body, req.user.id);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getCage', () => {
    it('should call getCageById and return 200', async () => {
      req = { params: { id: 'c1' }, galponId: 1, user: { id: 'user1' } };
      cageService.getCageById.mockResolvedValue({ id: 'c1', number: 'C1' });

      await cageController.getCage(req, res, next);

      expect(cageService.getCageById).toHaveBeenCalledWith('c1', 1, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getAllCages', () => {
    it('should return paginated cages with filters', async () => {
      req = {
        query: { page: '1', limit: '10', search: 'C1', type: 'reproducción', status: 'disponible' },
        galponId: 1,
        user: { id: 'user1' }
      };
      cageService.getAllCages.mockResolvedValue({
        data: [{ id: 'c1' }],
        pagination: { page: 1, limit: 10, total: 1 }
      });

      await cageController.getAllCages(req, res, next);

      expect(cageService.getAllCages).toHaveBeenCalledWith(
        1, 'user1',
        { search: 'C1', type: 'reproducción', status: 'disponible' },
        1, 10
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        cages: expect.any(Array),
        pagination: expect.any(Object)
      }));
    });

    it('should use defaults when query params are missing', async () => {
      req = { query: {}, galponId: 1, user: { id: 'user1' } };
      cageService.getAllCages.mockResolvedValue({ data: [], pagination: {} });

      await cageController.getAllCages(req, res, next);

      expect(cageService.getAllCages).toHaveBeenCalledWith(
        1, 'user1',
        { search: undefined, type: undefined, status: undefined },
        1, 10
      );
    });
  });

  describe('editCage', () => {
    it('should call editCage and return 200', async () => {
      req = { params: { id: 'c1' }, body: { status: 'mantenimiento' }, user: { id: 'user1' } };
      cageService.editCage.mockResolvedValue({ id: 'c1', status: 'mantenimiento' });

      await cageController.editCage(req, res, next);

      expect(cageService.editCage).toHaveBeenCalledWith('c1', { status: 'mantenimiento' }, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('deleteCage', () => {
    it('should call deleteCage and return 200', async () => {
      req = { params: { id: 'c1' }, user: { id: 'user1' } };
      cageService.deleteCage.mockResolvedValue();

      await cageController.deleteCage(req, res, next);

      expect(cageService.deleteCage).toHaveBeenCalledWith('c1', 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
