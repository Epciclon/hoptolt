jest.mock('../../../src/modules/invitation/invitation.service');
const invitationService = require('../../../src/modules/invitation/invitation.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const invitationController = require('../../../src/modules/invitation/invitation.controller');

describe('InvitationController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('createInvitation', () => {
    it('should call createInvitation and return 201', async () => {
      req = { params: { galponId: '1' }, body: { email: 'worker@test.com' }, user: { id: 'user1' } };
      invitationService.createInvitation.mockResolvedValue({ id: 'inv1', email: 'worker@test.com' });

      await invitationController.createInvitation(req, res, next);

      expect(invitationService.createInvitation).toHaveBeenCalledWith(1, 'worker@test.com', 'user1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getInvitationsByGalpon', () => {
    it('should call getInvitationsByGalpon and return 200', async () => {
      req = { params: { galponId: '1' }, user: { id: 'user1' } };
      invitationService.getInvitationsByGalpon.mockResolvedValue([{ id: 'inv1', email: 'worker@test.com' }]);

      await invitationController.getInvitationsByGalpon(req, res, next);

      expect(invitationService.getInvitationsByGalpon).toHaveBeenCalledWith(1, 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getMyPendingInvitations', () => {
    it('should call getPendingInvitationsForMe and return 200', async () => {
      req = { user: { email: 'user@test.com' } };
      invitationService.getPendingInvitationsForMe.mockResolvedValue([{ id: 'inv1', email: 'user@test.com' }]);

      await invitationController.getMyPendingInvitations(req, res, next);

      expect(invitationService.getPendingInvitationsForMe).toHaveBeenCalledWith('user@test.com');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('acceptInvitation', () => {
    it('should call acceptInvitation and return 200', async () => {
      req = {
        params: { token: 'abc123' },
        user: { id: 'user1', email: 'user@test.com' }
      };
      invitationService.acceptInvitation.mockResolvedValue({
        id: 'inv1',
        galpon: { name: 'Galpon A' }
      });

      await invitationController.acceptInvitation(req, res, next);

      expect(invitationService.acceptInvitation).toHaveBeenCalledWith('abc123', 'user1', 'user@test.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('revokeInvitation', () => {
    it('should call revokeInvitation and return 200', async () => {
      req = { params: { token: 'abc123' }, user: { id: 'user1' } };
      invitationService.revokeInvitation.mockResolvedValue();

      await invitationController.revokeInvitation(req, res, next);

      expect(invitationService.revokeInvitation).toHaveBeenCalledWith('abc123', 'user1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
