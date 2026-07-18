jest.mock('../../../src/modules/rabbit/rabbit.service');
const rabbitService = require('../../../src/modules/rabbit/rabbit.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const rabbitController = require('../../../src/modules/rabbit/rabbit.controller');

describe('RabbitController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('registerRabbit', () => {
    it('should call registerRabbit and return 201', async () => {
      req = { body: { name: 'Bunny', race: 'Rex' }, galponId: 1, user: { id: 'user1' } };
      rabbitService.registerRabbit.mockResolvedValue({ id: 'r1', name: 'Bunny' });

      await rabbitController.registerRabbit(req, res, next);

      expect(rabbitService.registerRabbit).toHaveBeenCalledWith(req.body, req.galponId, req.user.id);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getRabbit', () => {
    it('should call getRabbit and return 200', async () => {
      req = { params: { id: 'r1' }, user: { id: 'user1' } };
      rabbitService.getRabbit.mockResolvedValue({ id: 'r1', name: 'Bunny' });

      await rabbitController.getRabbit(req, res, next);

      expect(rabbitService.getRabbit).toHaveBeenCalledWith('r1', 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getAllRabbits', () => {
    it('should return paginated rabbits', async () => {
      req = {
        query: { page: '2', limit: '5', search: 'bunny', race: 'Rex', sex: 'macho', purpose: 'engorda' },
        galponId: 1,
        user: { id: 'user1' }
      };
      rabbitService.getAllRabbits.mockResolvedValue({
        data: [{ id: 'r1', name: 'Bunny' }],
        pagination: { page: 2, limit: 5, total: 10 }
      });

      await rabbitController.getAllRabbits(req, res, next);

      expect(rabbitService.getAllRabbits).toHaveBeenCalledWith(
        1, 'user1',
        { search: 'bunny', race: 'Rex', sex: 'macho', purpose: 'engorda' },
        2, 5
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        rabbits: expect.any(Array),
        pagination: expect.any(Object)
      }));
    });

    it('should use defaults for page and limit', async () => {
      req = { query: {}, galponId: 1, user: { id: 'user1' } };
      rabbitService.getAllRabbits.mockResolvedValue({ data: [], pagination: {} });

      await rabbitController.getAllRabbits(req, res, next);

      expect(rabbitService.getAllRabbits).toHaveBeenCalledWith(
        1, 'user1',
        { search: undefined, race: undefined, sex: undefined, purpose: undefined },
        1, 12
      );
    });
  });

  describe('getRabbitsByRace', () => {
    it('should call getRabbitsByRace and return 200', async () => {
      req = { params: { race: 'Rex' }, galponId: 1, user: { id: 'user1' } };
      rabbitService.getRabbitsByRace.mockResolvedValue([{ id: 'r1' }]);

      await rabbitController.getRabbitsByRace(req, res, next);

      expect(rabbitService.getRabbitsByRace).toHaveBeenCalledWith('Rex', 1, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('editRabbit', () => {
    it('should call editRabbit and return 200', async () => {
      req = { params: { id: 'r1' }, body: { name: 'Updated' }, user: { id: 'user1' } };
      rabbitService.editRabbit.mockResolvedValue({ id: 'r1', name: 'Updated' });

      await rabbitController.editRabbit(req, res, next);

      expect(rabbitService.editRabbit).toHaveBeenCalledWith('r1', { name: 'Updated' }, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteRabbit', () => {
    it('should call deleteRabbit and return 200', async () => {
      req = { params: { id: 'r1' }, user: { id: 'user1' } };
      rabbitService.deleteRabbit.mockResolvedValue();

      await rabbitController.deleteRabbit(req, res, next);

      expect(rabbitService.deleteRabbit).toHaveBeenCalledWith('r1', 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getAvailableRaces', () => {
    it('should call getAvailableRaces and return 200', async () => {
      req = {};
      rabbitService.getAvailableRaces.mockResolvedValue(['Rex', 'Mini Lop']);

      await rabbitController.getAvailableRaces(req, res, next);

      expect(rabbitService.getAvailableRaces).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getPotentialFathers', () => {
    it('should call getPotentialFathers and return 200', async () => {
      req = { galponId: 1, user: { id: 'user1' } };
      rabbitService.getPotentialFathers.mockResolvedValue([{ id: 'r1' }]);

      await rabbitController.getPotentialFathers(req, res, next);

      expect(rabbitService.getPotentialFathers).toHaveBeenCalledWith(1, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getPotentialMothers', () => {
    it('should call getPotentialMothers and return 200', async () => {
      req = { galponId: 1, user: { id: 'user1' } };
      rabbitService.getPotentialMothers.mockResolvedValue([{ id: 'r2' }]);

      await rabbitController.getPotentialMothers(req, res, next);

      expect(rabbitService.getPotentialMothers).toHaveBeenCalledWith(1, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('suggestName', () => {
    it('should call suggestName and return 200', async () => {
      req = { query: { sex: 'macho' } };
      rabbitService.suggestName.mockReturnValue('Thor');

      await rabbitController.suggestName(req, res, next);

      expect(rabbitService.suggestName).toHaveBeenCalledWith('macho');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, name: 'Thor' });
    });
  });
});
