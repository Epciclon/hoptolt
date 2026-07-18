require('../../setup');

jest.mock('../../../src/modules/invitation/invitation.repository');
jest.mock('../../../src/modules/farmMember/farmMember.repository');
jest.mock('../../../src/modules/farmMember/farmMember.service');
jest.mock('../../../src/modules/notification/notification.service', () => ({
  createNotification: jest.fn().mockResolvedValue({ id: 1 }),
}));
jest.mock('../../../src/common/middlewares/auth.middleware', () => ({
  clearCache: jest.fn(),
}));

const invitationRepository = require('../../../src/modules/invitation/invitation.repository');
const farmMemberRepository = require('../../../src/modules/farmMember/farmMember.repository');
const farmMemberService = require('../../../src/modules/farmMember/farmMember.service');
const invitationService = require('../../../src/modules/invitation/invitation.service');
const notificationService = require('../../../src/modules/notification/notification.service');
const { Profile } = require('../../../src/domain/models');

describe('InvitationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    beforeEach(() => {
      farmMemberRepository.findMembership.mockImplementation((profileId) => {
        if (profileId === 'p1') return { id: 1, role: 'owner', status: 'active' };
        return null;
      });
      Profile.findByPk.mockImplementation((id) => {
        if (id === 'p1') return { id: 'p1', email: 'owner@e.com' };
        if (id === 'p2') return { id: 'p2', email: 'worker@e.com' };
        return null;
      });
      Profile.findOne = jest.fn().mockImplementation(({ where }) => {
        if (where.email === 'worker@e.com') return { id: 'p2', email: 'worker@e.com' };
        if (where.email === 'nonexistent@e.com') return null;
        return null;
      });
      invitationRepository.findPendingByEmail.mockResolvedValue([]);
      invitationRepository.create.mockResolvedValue({ id: 1, token: 'abc123', email: 'worker@e.com', status: 'pending' });
      invitationRepository.getGalponWithOwner.mockResolvedValue({ id: 1, name: 'Galpon 1', profileId: 'p1' });
    });

    it('creates invitation for worker email', async () => {
      const result = await invitationService.createInvitation(1, 'worker@e.com', 'p1');
      expect(result.email).toBe('worker@e.com');
      expect(notificationService.createNotification).toHaveBeenCalled();
    });

    it('throws when not owner', async () => {
      farmMemberRepository.findMembership.mockResolvedValue({ id: 1, role: 'worker', status: 'active' });
      await expect(invitationService.createInvitation(1, 'w@e.com', 'p1')).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws when inviting self', async () => {
      await expect(invitationService.createInvitation(1, 'owner@e.com', 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when invited user not registered', async () => {
      await expect(invitationService.createInvitation(1, 'nonexistent@e.com', 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when user is already active member', async () => {
      farmMemberRepository.findMembership.mockImplementation((profileId, galponId) => {
        if (profileId === 'p2') return { id: 2, status: 'active' };
        return { id: 1, role: 'owner', status: 'active' };
      });
      await expect(invitationService.createInvitation(1, 'worker@e.com', 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when pending invitation already exists', async () => {
      invitationRepository.findPendingByEmail.mockResolvedValue([{ galponId: 1 }]);
      await expect(invitationService.createInvitation(1, 'worker@e.com', 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getInvitationsByGalpon', () => {
    it('returns invitations when owner', async () => {
      farmMemberRepository.findMembership.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });
      invitationRepository.findByGalponId.mockResolvedValue([{ id: 1, email: 'w@e.com' }]);
      const result = await invitationService.getInvitationsByGalpon(1, 'p1');
      expect(result).toHaveLength(1);
    });

    it('throws when not owner', async () => {
      farmMemberRepository.findMembership.mockResolvedValue({ id: 1, role: 'worker', status: 'active' });
      await expect(invitationService.getInvitationsByGalpon(1, 'p1')).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('getPendingInvitationsForMe', () => {
    it('returns pending invitations for email', async () => {
      invitationRepository.findPendingByEmail.mockResolvedValue([{ id: 1, email: 'w@e.com', status: 'pending' }]);
      const result = await invitationService.getPendingInvitationsForMe('w@e.com');
      expect(result).toHaveLength(1);
    });
  });

  describe('acceptInvitation', () => {
    beforeEach(() => {
      invitationRepository.findByToken.mockResolvedValue({ id: 1, token: 'abc123', email: 'worker@e.com', status: 'pending', galponId: 1 });
      farmMemberService.createWorkerMembership = jest.fn().mockResolvedValue({ id: 1 });
      invitationRepository.updateStatus = jest.fn().mockResolvedValue({ id: 1, status: 'accepted' });
      Profile.update = jest.fn().mockResolvedValue([1]);
      invitationRepository.getGalponWithOwner.mockResolvedValue({ id: 1, name: 'Galpon 1', profileId: 'p1' });
      Profile.findByPk.mockImplementation((id) => {
        if (id === 'p2') return { id: 'p2', username: 'worker' };
        return { id: 'p1', username: 'owner' };
      });
    });

    it('accepts invitation and creates membership', async () => {
      const result = await invitationService.acceptInvitation('abc123', 'p2', 'worker@e.com');
      expect(result.status).toBe('pending');
      expect(farmMemberService.createWorkerMembership).toHaveBeenCalled();
      expect(invitationRepository.updateStatus).toHaveBeenCalledWith(expect.any(Object), 'accepted');
    });

    it('throws when token not found', async () => {
      invitationRepository.findByToken.mockResolvedValue(null);
      await expect(invitationService.acceptInvitation('invalid', 'p2', 'w@e.com')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when invitation already processed', async () => {
      invitationRepository.findByToken.mockResolvedValue({ id: 1, status: 'accepted' });
      await expect(invitationService.acceptInvitation('abc123', 'p2', 'w@e.com')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when email does not match', async () => {
      await expect(invitationService.acceptInvitation('abc123', 'p2', 'other@e.com')).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('revokeInvitation', () => {
    beforeEach(() => {
      invitationRepository.findByToken.mockResolvedValue({ id: 1, token: 'abc123', email: 'worker@e.com', status: 'pending', galponId: 1 });
      invitationRepository.updateStatus = jest.fn().mockResolvedValue({ id: 1, status: 'revoked' });
    });

    it('revokes pending invitation as owner', async () => {
      farmMemberRepository.findMembership.mockResolvedValue({ id: 1, role: 'owner', status: 'active' });
      Profile.findByPk.mockResolvedValue({ id: 'p1', email: 'owner@e.com' });
      await invitationService.revokeInvitation('abc123', 'p1');
      expect(invitationRepository.updateStatus).toHaveBeenCalledWith(expect.any(Object), 'revoked');
    });

    it('revokes pending invitation as invited user', async () => {
      farmMemberRepository.findMembership.mockResolvedValue(null);
      Profile.findByPk.mockResolvedValue({ id: 'p2', email: 'worker@e.com' });
      invitationRepository.getGalponWithOwner.mockResolvedValue({ id: 1, name: 'Galpon 1', profileId: 'p1' });

      await invitationService.revokeInvitation('abc123', 'p2');
      expect(invitationRepository.updateStatus).toHaveBeenCalled();
      expect(notificationService.createNotification).toHaveBeenCalled();
    });

    it('throws when invitation not found', async () => {
      invitationRepository.findByToken.mockResolvedValue(null);
      await expect(invitationService.revokeInvitation('invalid', 'p1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws when invitation is not pending', async () => {
      invitationRepository.findByToken.mockResolvedValue({ id: 1, status: 'accepted' });
      await expect(invitationService.revokeInvitation('abc123', 'p1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws when user has no permission', async () => {
      farmMemberRepository.findMembership.mockResolvedValue({ id: 1, role: 'worker', status: 'active' });
      Profile.findByPk.mockResolvedValue({ id: 'p3', email: 'other@e.com' });
      await expect(invitationService.revokeInvitation('abc123', 'p3')).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
