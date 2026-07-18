jest.mock('../../../src/modules/genealogy/genealogy.service');
const genealogyService = require('../../../src/modules/genealogy/genealogy.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const genealogyController = require('../../../src/modules/genealogy/genealogy.controller');

describe('GenealogyController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('registerGenealogy', () => {
    it('should call registerGenealogy and return 201', async () => {
      req = { body: { rabbitId: 1, fatherId: 2, motherId: 3 }, galponId: 1 };
      genealogyService.registerGenealogy.mockResolvedValue({ id: 'g1', rabbitId: 1 });

      await genealogyController.registerGenealogy(req, res, next);

      expect(genealogyService.registerGenealogy).toHaveBeenCalledWith(req.body, 1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getGenealogy', () => {
    it('should return genealogy when found', async () => {
      req = { params: { rabbitId: '1' } };
      genealogyService.getGenealogy.mockResolvedValue({ id: 'g1', rabbitId: 1 });

      await genealogyController.getGenealogy(req, res, next);

      expect(genealogyService.getGenealogy).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return null when no genealogy found', async () => {
      req = { params: { rabbitId: '1' } };
      genealogyService.getGenealogy.mockResolvedValue(null);

      await genealogyController.getGenealogy(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, genealogy: null });
    });
  });

  describe('getAllGenealogies', () => {
    it('should return all genealogies for galpon', async () => {
      req = { galponId: 1 };
      genealogyService.getAllGenealogies.mockResolvedValue([{ id: 'g1' }, { id: 'g2' }]);

      await genealogyController.getAllGenealogies(req, res, next);

      expect(genealogyService.getAllGenealogies).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        genealogies: expect.any(Array)
      }));
    });
  });

  describe('editGenealogy', () => {
    it('should call editGenealogy and return 200', async () => {
      req = { params: { rabbitId: '1' }, body: { fatherId: 5 } };
      genealogyService.editGenealogy.mockResolvedValue({ id: 'g1', rabbitId: 1, fatherId: 5 });

      await genealogyController.editGenealogy(req, res, next);

      expect(genealogyService.editGenealogy).toHaveBeenCalledWith('1', { fatherId: 5 });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getGenealogyTree', () => {
    it('should call getGenealogyTree and return 200', async () => {
      req = { params: { rabbitId: '1' }, query: { levels: '4' } };
      genealogyService.getGenealogyTree.mockResolvedValue({ rabbitId: 1, tree: {} });

      await genealogyController.getGenealogyTree(req, res, next);

      expect(genealogyService.getGenealogyTree).toHaveBeenCalledWith('1', '4');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should use default levels when not provided', async () => {
      req = { params: { rabbitId: '1' }, query: {} };
      genealogyService.getGenealogyTree.mockResolvedValue({ rabbitId: 1 });

      await genealogyController.getGenealogyTree(req, res, next);

      expect(genealogyService.getGenealogyTree).toHaveBeenCalledWith('1', 3);
    });
  });

  describe('checkConsanguinity', () => {
    it('should call checkConsanguinity and return 200', async () => {
      req = { params: { id1: '1', id2: '2' } };
      genealogyService.checkConsanguinity.mockResolvedValue(false);

      await genealogyController.checkConsanguinity(req, res, next);

      expect(genealogyService.checkConsanguinity).toHaveBeenCalledWith(1, 2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, areRelated: false });
    });
  });
});
