require('../../setup');

jest.mock('../../../src/modules/galpon/galpon.repository');
jest.mock('../../../src/common/middlewares/auth.middleware', () => ({
  authenticate: jest.fn(),
  supabase: {},
  clearCache: jest.fn(),
}));

const galponRepository = require('../../../src/modules/galpon/galpon.repository');
const galponService = require('../../../src/modules/galpon/galpon.service');
const { Profile, FarmMember, Cage } = require('../../../src/domain/models');

describe('GalponService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerGalpon', () => {
    beforeEach(() => {
      galponRepository.findByNameAndProfileId.mockResolvedValue(null);
      galponRepository.create.mockResolvedValue({ id: 1, name: 'Galpon 1', profileId: 'p1' });
      FarmMember.create = jest.fn().mockResolvedValue({ id: 1, profileId: 'p1', galponId: 1, role: 'owner', status: 'active' });
      Profile.update = jest.fn().mockResolvedValue([1]);
    });

    it('creates a galpon and owner membership', async () => {
      const data = { name: 'Galpon 1', province: 'Pichincha', location: 'Quito', totalCapacity: 50, foodTypes: ['pellets'], vaccines: [], dewormingPeriod: 30 };
      const result = await galponService.registerGalpon(data, 'p1');
      expect(result.name).toBe('Galpon 1');
      expect(FarmMember.create).toHaveBeenCalledWith({ profileId: 'p1', galponId: 1, role: 'owner', status: 'active' });
      expect(Profile.update).toHaveBeenCalled();
    });

    it('throws when name is already in use', async () => {
      galponRepository.findByNameAndProfileId.mockResolvedValue({ id: 2 });
      await expect(galponService.registerGalpon({ name: 'Galpon 1', province: 'P', location: 'Q', totalCapacity: 10, foodTypes: [], vaccines: [], dewormingPeriod: 30 }, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getGalponById', () => {
    it('returns galpon when found', async () => {
      galponRepository.findById.mockResolvedValue({ id: 1, name: 'Galpon 1' });
      const result = await galponService.getGalponById(1);
      expect(result.name).toBe('Galpon 1');
    });

    it('throws 404 when not found', async () => {
      galponRepository.findById.mockResolvedValue(null);
      await expect(galponService.getGalponById(999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getGalponByName', () => {
    it('returns galpon when found', async () => {
      galponRepository.findByName.mockResolvedValue({ id: 1, name: 'Galpon 1' });
      const result = await galponService.getGalponByName('Galpon 1');
      expect(result.name).toBe('Galpon 1');
    });

    it('throws when name is empty', async () => {
      await expect(galponService.getGalponByName('')).rejects.toMatchObject({ statusCode: 400 });
      await expect(galponService.getGalponByName(null)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 404 when not found', async () => {
      galponRepository.findByName.mockResolvedValue(null);
      await expect(galponService.getGalponByName('Unknown')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getAllGalpones', () => {
    it('returns combined owner and worker galpones', async () => {
      galponRepository.findByProfileId.mockResolvedValue([{ id: 1, name: 'Own Galpon', get: () => ({ id: 1, name: 'Own Galpon' }) }]);
      galponRepository.countByProfileId.mockResolvedValue(1);
      FarmMember.findAll = jest.fn().mockResolvedValue([]);
      FarmMember.count = jest.fn().mockResolvedValue(0);

      const result = await galponService.getAllGalpones('p1', 1, 10);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('editGalpon', () => {
    it('updates galpon when owner', async () => {
      galponRepository.findById.mockResolvedValue({ id: 1, profileId: 'p1' });
      FarmMember.findOne.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });
      galponRepository.update.mockResolvedValue({ id: 1, name: 'Updated' });
      Cage.count = jest.fn().mockResolvedValue(5);

      const result = await galponService.editGalpon(1, { name: 'Updated', totalCapacity: 10 }, 'p1');
      expect(galponRepository.update).toHaveBeenCalled();
    });

    it('throws 404 when galpon not found', async () => {
      galponRepository.findById.mockResolvedValue(null);
      await expect(galponService.editGalpon(999, {}, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when not owner', async () => {
      galponRepository.findById.mockResolvedValue({ id: 1, profileId: 'p2' });
      FarmMember.findOne.mockResolvedValue(null);
      await expect(galponService.editGalpon(1, {}, 'p1')).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws when reducing capacity below cage count', async () => {
      galponRepository.findById.mockResolvedValue({ id: 1, profileId: 'p1' });
      FarmMember.findOne.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });
      Cage.count = jest.fn().mockResolvedValue(10);

      await expect(galponService.editGalpon(1, { totalCapacity: 5 }, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('deleteGalpon', () => {
    it('deletes galpon', async () => {
      galponRepository.findById.mockResolvedValue({ id: 1, profileId: 'p1' });
      FarmMember.findOne.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });
      Cage.count = jest.fn().mockResolvedValue(0);
      galponRepository.delete = jest.fn().mockResolvedValue(true);

      await galponService.deleteGalpon(1, 'p1');
      expect(galponRepository.delete).toHaveBeenCalled();
    });

    it('prevents deletion with existing cages', async () => {
      galponRepository.findById.mockResolvedValue({ id: 1, profileId: 'p1' });
      FarmMember.findOne.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });
      Cage.count = jest.fn().mockResolvedValue(3);

      await expect(galponService.deleteGalpon(1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getActiveGalpon', () => {
    it('returns active galpon with role', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'p1', activeGalponId: 1 });
      galponRepository.findById.mockResolvedValue({ id: 1, name: 'Galpon 1', profileId: 'p1', get: () => ({ id: 1, name: 'Galpon 1', profileId: 'p1' }) });

      const result = await galponService.getActiveGalpon('p1');
      expect(result.name).toBe('Galpon 1');
      expect(result.memberRole).toBe('owner');
    });

    it('returns null when no active galpon', async () => {
      Profile.findByPk.mockResolvedValue({ id: 'p1', activeGalponId: null });
      const result = await galponService.getActiveGalpon('p1');
      expect(result).toBeNull();
    });
  });

  describe('setActiveGalpon', () => {
    it('sets active galpon for user', async () => {
      galponRepository.findById.mockResolvedValue({ id: 1, name: 'Galpon 1' });
      FarmMember.findOne.mockResolvedValue({ id: 1, role: 'worker', status: 'active' });
      Profile.update = jest.fn().mockResolvedValue([1]);

      const result = await galponService.setActiveGalpon(1, 'p1');
      expect(result.name).toBe('Galpon 1');
    });

    it('throws when galpon not found', async () => {
      galponRepository.findById.mockResolvedValue(null);
      await expect(galponService.setActiveGalpon(999, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when no membership', async () => {
      galponRepository.findById.mockResolvedValue({ id: 1 });
      FarmMember.findOne.mockResolvedValue(null);
      await expect(galponService.setActiveGalpon(1, 'p1')).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
