jest.mock('../../../src/modules/race/race.service');
const raceService = require('../../../src/modules/race/race.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const raceController = require('../../../src/modules/race/race.controller');

describe('RaceController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('registerRace', () => {
    it('should call registerRace and return 201', async () => {
      req = { body: { name: 'Rex', description: 'Conejo Rex' }, user: { id: 'user1' } };
      raceService.registerRace.mockResolvedValue({ id: 'race1', name: 'Rex' });

      await raceController.registerRace(req, res, next);

      expect(raceService.registerRace).toHaveBeenCalledWith(req.body, req.user.id);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getRaceById', () => {
    it('should call getRaceById and return 200', async () => {
      req = { params: { id: 'race1' } };
      raceService.getRaceById.mockResolvedValue({ id: 'race1', name: 'Rex' });

      await raceController.getRaceById(req, res, next);

      expect(raceService.getRaceById).toHaveBeenCalledWith('race1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getAllRaces', () => {
    it('should return paginated races with search filter', async () => {
      req = {
        query: { page: '2', limit: '5', search: 'Rex' },
        user: { id: 'user1' },
        galpon: null
      };
      raceService.getAllRaces.mockResolvedValue({
        data: [{ id: 'race1', name: 'Rex' }],
        pagination: { page: 2, limit: 5, total: 1 }
      });

      await raceController.getAllRaces(req, res, next);

      expect(raceService.getAllRaces).toHaveBeenCalledWith(
        'user1',
        { search: 'Rex' },
        2, 5
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        races: expect.any(Array),
        pagination: expect.any(Object)
      }));
    });

    it('should use galpon profileId when galpon is present', async () => {
      req = {
        query: {},
        user: { id: 'user1' },
        galpon: { profileId: 'owner1' }
      };
      raceService.getAllRaces.mockResolvedValue({ data: [], pagination: {} });

      await raceController.getAllRaces(req, res, next);

      expect(raceService.getAllRaces).toHaveBeenCalledWith(
        'owner1',
        { search: undefined },
        1, 10
      );
    });
  });

  describe('editRace', () => {
    it('should call editRaceDescription and return 200', async () => {
      req = { params: { id: 'race1' }, body: { description: 'Updated desc' } };
      raceService.editRaceDescription.mockResolvedValue({ id: 'race1', description: 'Updated desc' });

      await raceController.editRace(req, res, next);

      expect(raceService.editRaceDescription).toHaveBeenCalledWith('race1', { description: 'Updated desc' });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteRace', () => {
    it('should call deleteRace and return 200', async () => {
      req = { params: { id: 'race1' } };
      raceService.deleteRace.mockResolvedValue();

      await raceController.deleteRace(req, res, next);

      expect(raceService.deleteRace).toHaveBeenCalledWith('race1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
