require('../../setup');

jest.mock('../../../src/modules/race/race.repository');

const raceRepository = require('../../../src/modules/race/race.repository');
const raceService = require('../../../src/modules/race/race.service');
const { Rabbit } = require('../../../src/domain/models');

describe('RaceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerRace', () => {
    it('creates a new race', async () => {
      raceRepository.findByNameAndProfile.mockResolvedValue(null);
      raceRepository.create.mockResolvedValue({ id: 1, name: 'New Zealand', description: 'Great breed', profileId: 'p1' });

      const result = await raceService.registerRace({ name: 'New Zealand', description: 'Great breed', imageUrl: null }, 'p1');
      expect(result.name).toBe('New Zealand');
    });

    it('throws when name is already in use', async () => {
      raceRepository.findByNameAndProfile.mockResolvedValue({ id: 1 });
      await expect(raceService.registerRace({ name: 'New Zealand', description: 'Great breed' }, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getRaceById', () => {
    it('returns race when found', async () => {
      raceRepository.findById.mockResolvedValue({ id: 1, name: 'New Zealand' });
      const result = await raceService.getRaceById(1);
      expect(result.id).toBe(1);
    });

    it('throws 404 when not found', async () => {
      raceRepository.findById.mockResolvedValue(null);
      await expect(raceService.getRaceById(999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getAllRaces', () => {
    it('returns paginated results', async () => {
      raceRepository.findByProfile.mockResolvedValue([{ id: 1, name: 'New Zealand' }]);
      raceRepository.countByProfile.mockResolvedValue(1);

      const result = await raceService.getAllRaces('p1', {}, 1, 10);
      expect(result.data).toHaveLength(1);
    });

    it('returns empty when no profileId', async () => {
      const result = await raceService.getAllRaces(null);
      expect(result.data).toEqual([]);
    });
  });

  describe('editRaceDescription', () => {
    it('updates race', async () => {
      raceRepository.findById.mockResolvedValue({ id: 1, name: 'New Zealand' });
      raceRepository.update.mockResolvedValue({ id: 1, description: 'Updated description' });

      const result = await raceService.editRaceDescription(1, { description: 'Updated description' });
      expect(raceRepository.update).toHaveBeenCalled();
    });

    it('throws 404 when race not found', async () => {
      raceRepository.findById.mockResolvedValue(null);
      await expect(raceService.editRaceDescription(999, { description: 'test' })).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deleteRace', () => {
    it('deletes race', async () => {
      raceRepository.findById.mockResolvedValue({ id: 1, name: 'New Zealand' });
      Rabbit.count = jest.fn().mockResolvedValue(0);
      raceRepository.delete = jest.fn().mockResolvedValue(true);

      await raceService.deleteRace(1);
      expect(raceRepository.delete).toHaveBeenCalled();
    });

    it('prevents deletion when rabbits are associated', async () => {
      raceRepository.findById.mockResolvedValue({ id: 1, name: 'New Zealand' });
      Rabbit.count = jest.fn().mockResolvedValue(3);

      await expect(raceService.deleteRace(1)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 404 when race not found', async () => {
      raceRepository.findById.mockResolvedValue(null);
      await expect(raceService.deleteRace(999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
