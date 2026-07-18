require('../../setup');

jest.mock('../../../src/modules/farmMember/farmMember.repository');
jest.mock('../../../src/modules/galpon/galpon.repository');
jest.mock('../../../src/modules/notification/notification.service', () => ({
  createNotification: jest.fn().mockResolvedValue({ id: 1 }),
}));

const farmMemberRepository = require('../../../src/modules/farmMember/farmMember.repository');
const galponRepository = require('../../../src/modules/galpon/galpon.repository');
const farmMemberService = require('../../../src/modules/farmMember/farmMember.service');
const notificationService = require('../../../src/modules/notification/notification.service');
const { Profile, Cage, Assignment } = require('../../../src/domain/models');

describe('FarmMemberService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWorkersByGalpon', () => {
    it('returns workers for galpon', async () => {
      farmMemberRepository.findByGalponId.mockResolvedValue([{ id: 1, role: 'worker' }, { id: 2, role: 'owner' }]);
      farmMemberRepository.findMembership.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });

      const result = await farmMemberService.getWorkersByGalpon(1, 'p1');
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('worker');
    });

    it('throws when not owner', async () => {
      farmMemberRepository.findMembership.mockResolvedValue({ id: 1, role: 'worker', status: 'active' });
      await expect(farmMemberService.getWorkersByGalpon(1, 'p1')).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('createWorkerMembership', () => {
    it('creates worker membership', async () => {
      farmMemberRepository.findMembership.mockResolvedValue(null);
      farmMemberRepository.create.mockResolvedValue({ id: 1, profileId: 'p1', galponId: 1, role: 'worker', status: 'active' });

      const result = await farmMemberService.createWorkerMembership('p1', 1);
      expect(result.role).toBe('worker');
    });

    it('throws when already active member', async () => {
      farmMemberRepository.findMembership.mockResolvedValue({ id: 1, status: 'active' });
      await expect(farmMemberService.createWorkerMembership('p1', 1)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('reactivates existing inactive membership', async () => {
      farmMemberRepository.findMembership.mockResolvedValue({ id: 1, status: 'inactive' });
      farmMemberRepository.update = jest.fn().mockResolvedValue({ id: 1, status: 'active', role: 'worker' });

      const result = await farmMemberService.createWorkerMembership('p1', 1);
      expect(farmMemberRepository.update).toHaveBeenCalled();
    });
  });

  describe('updateWorker', () => {
    beforeEach(() => {
      farmMemberRepository.findById.mockResolvedValue({
        id: 1, role: 'worker', galponId: 1, profileId: 'w1',
        permissions: [], assignedCages: [],
      });
      farmMemberRepository.findMembership.mockResolvedValue({ id: 2, role: 'owner', status: 'active' });
    });

    it('updates worker permissions', async () => {
      farmMemberRepository.replacePermissions = jest.fn().mockResolvedValue(undefined);
      farmMemberRepository.findById.mockResolvedValue({
        id: 1, role: 'worker', galponId: 1, profileId: 'w1',
        permissions: [{ moduleName: 'feeding', canCreate: true }],
        assignedCages: [],
      });
      Profile.findByPk.mockResolvedValue({ id: 'p1', username: 'owner' });
      galponRepository.findById.mockResolvedValue({ id: 1, name: 'Galpon 1' });

      const result = await farmMemberService.updateWorker(1, { permissions: [{ moduleName: 'feeding', canCreate: true, canRead: true }] }, 'p1');
      expect(result).toBeDefined();
    });

    it('throws when member not found', async () => {
      farmMemberRepository.findById.mockResolvedValue(null);
      await expect(farmMemberService.updateWorker(999, {}, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when trying to edit owner', async () => {
      farmMemberRepository.findById.mockResolvedValue({ id: 1, role: 'owner', galponId: 1 });
      await expect(farmMemberService.updateWorker(1, {}, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('removeWorker', () => {
    beforeEach(() => {
      farmMemberRepository.findById.mockResolvedValue({ id: 1, role: 'worker', galponId: 1, profileId: 'w1' });
      farmMemberRepository.findMembership.mockResolvedValue({ id: 2, role: 'owner', status: 'active' });
      galponRepository.findById.mockResolvedValue({ id: 1, name: 'Galpon 1' });
      Profile.findByPk.mockResolvedValue({ id: 'p1', username: 'owner' });
    });

    it('deactivates worker', async () => {
      farmMemberRepository.deactivate = jest.fn().mockResolvedValue(true);
      await farmMemberService.removeWorker(1, 'p1');
      expect(farmMemberRepository.deactivate).toHaveBeenCalled();
      expect(notificationService.createNotification).toHaveBeenCalled();
    });

    it('throws when trying to remove owner', async () => {
      farmMemberRepository.findById.mockResolvedValue({ id: 1, role: 'owner', galponId: 1 });
      await expect(farmMemberService.removeWorker(1, 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getWorkerById', () => {
    it('returns worker when owner', async () => {
      farmMemberRepository.findById.mockResolvedValue({ id: 1, role: 'worker', galponId: 1 });
      farmMemberRepository.findMembership.mockResolvedValue({ id: 2, role: 'owner', status: 'active' });

      const result = await farmMemberService.getWorkerById(1, 'p1');
      expect(result.id).toBe(1);
    });

    it('throws when not found', async () => {
      farmMemberRepository.findById.mockResolvedValue(null);
      await expect(farmMemberService.getWorkerById(999, 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getAllMembersByGalpon', () => {
    it('returns all members', async () => {
      farmMemberRepository.findByGalponId.mockResolvedValue([{ id: 1, role: 'owner' }, { id: 2, role: 'worker' }]);
      const result = await farmMemberService.getAllMembersByGalpon(1);
      expect(result).toHaveLength(2);
    });
  });

  describe('getMembershipsForUser', () => {
    it('returns memberships for profile', async () => {
      farmMemberRepository.findByProfileId.mockResolvedValue([{ id: 1, galponId: 1, role: 'owner' }]);
      const result = await farmMemberService.getMembershipsForUser('p1');
      expect(result).toHaveLength(1);
    });
  });

  describe('createOwnerMembership', () => {
    it('creates owner membership', async () => {
      farmMemberRepository.findMembership.mockResolvedValue(null);
      farmMemberRepository.create.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });

      const result = await farmMemberService.createOwnerMembership('p1', 1);
      expect(result.role).toBe('owner');
    });

    it('reactivates existing membership as owner', async () => {
      farmMemberRepository.findMembership.mockResolvedValue({ id: 1, status: 'inactive' });
      farmMemberRepository.update = jest.fn().mockResolvedValue({ id: 1, status: 'active', role: 'owner' });

      const result = await farmMemberService.createOwnerMembership('p1', 1);
      expect(result.role).toBe('owner');
    });
  });
});
