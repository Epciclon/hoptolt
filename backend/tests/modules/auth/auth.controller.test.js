jest.mock('../../../src/modules/auth/auth.service');
const authService = require('../../../src/modules/auth/auth.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const flushPromises = () => new Promise(r => setTimeout(r, 0));

const authController = require('../../../src/modules/auth/auth.controller');

describe('AuthController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  describe('syncProfile', () => {
    it('should call syncProfile and return 201', async () => {
      req = { body: { id: '1', email: 'test@test.com' } };
      const mockProfile = { id: '1', email: 'test@test.com', fullName: 'Test' };
      authService.syncProfile.mockResolvedValue(mockProfile);

      await authController.syncProfile(req, res, next);

      expect(authService.syncProfile).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should pass errors to next middleware', async () => {
      req = { body: { id: '1' } };
      const error = new Error('Sync failed');
      authService.syncProfile.mockRejectedValue(error);

      await authController.syncProfile(req, res, next);
      await flushPromises();

      expect(authService.syncProfile).toHaveBeenCalledWith(req.body);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getMe', () => {
    it('should call getMe and return 200', async () => {
      req = { user: { id: 'user1' } };
      const mockProfile = { id: 'user1', email: 'test@test.com' };
      authService.getMe.mockResolvedValue(mockProfile);

      await authController.getMe(req, res, next);

      expect(authService.getMe).toHaveBeenCalledWith(req.user.id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should pass errors to next middleware', async () => {
      req = { user: { id: 'user1' } };
      const error = new Error('User not found');
      authService.getMe.mockRejectedValue(error);

      await authController.getMe(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('setActiveGalpon', () => {
    it('should set active galpon and return 200', async () => {
      req = { body: { galponId: 5 }, user: { id: 'user1' } };
      const mockProfile = { id: 'user1', activeGalponId: 5 };
      authService.setActiveGalpon.mockResolvedValue(mockProfile);

      await authController.setActiveGalpon(req, res, next);

      expect(authService.setActiveGalpon).toHaveBeenCalledWith(req.user.id, 5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should handle null galponId', async () => {
      req = { body: { galponId: null }, user: { id: 'user1' } };
      authService.setActiveGalpon.mockResolvedValue({ id: 'user1' });

      await authController.setActiveGalpon(req, res, next);

      expect(authService.setActiveGalpon).toHaveBeenCalledWith(req.user.id, null);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('resolveEmail', () => {
    it('should resolve email and return 200', async () => {
      req = { query: { identifier: 'user@test.com' } };
      authService.resolveEmail.mockResolvedValue('user@test.com');

      await authController.resolveEmail(req, res, next);

      expect(authService.resolveEmail).toHaveBeenCalledWith('user@test.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, email: 'user@test.com' });
    });

    it('should return 400 when identifier is missing', async () => {
      req = { query: {} };

      await authController.resolveEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: expect.any(String) });
    });
  });

  describe('updateProfile', () => {
    it('should update profile and return 200', async () => {
      req = { body: { fullName: 'New Name', username: 'newname' }, user: { id: 'user1' } };
      const mockProfile = { id: 'user1', fullName: 'New Name', username: 'newname' };
      authService.updateProfile.mockResolvedValue(mockProfile);

      await authController.updateProfile(req, res, next);

      expect(authService.updateProfile).toHaveBeenCalledWith(req.user.id, { fullName: 'New Name', username: 'newname' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('deleteAccount', () => {
    it('should delete account and return 200', async () => {
      req = { body: { currentPassword: 'pass123' }, user: { id: 'user1' } };
      authService.deleteAccount.mockResolvedValue();

      await authController.deleteAccount(req, res, next);

      expect(authService.deleteAccount).toHaveBeenCalledWith(req.user.id, 'pass123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 when password is missing', async () => {
      req = { body: {}, user: { id: 'user1' } };

      await authController.deleteAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: expect.any(String) });
    });
  });
});
