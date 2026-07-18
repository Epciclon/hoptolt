require('../../setup');

jest.mock('../../../src/modules/auth/auth.repository');
jest.mock('../../../src/common/middlewares/auth.middleware', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
    },
  },
  clearCache: jest.fn(),
}));

const authService = require('../../../src/modules/auth/auth.service');
const authRepository = require('../../../src/modules/auth/auth.repository');
const { supabase } = require('../../../src/common/middlewares/auth.middleware');
const { Profile, Galpon, FarmMember, Notification, AuditLog } = require('../../../src/domain/models');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncProfile', () => {
    it('creates/upserts profile with valid data', async () => {
      authRepository.findByUsername.mockResolvedValue(null);
      authRepository.upsert.mockResolvedValue({ id: '1', email: 'j@e.com', fullName: 'John', username: 'jdoe' });

      const result = await authService.syncProfile({ id: '1', email: 'J@E.COM', fullName: 'John', username: 'Jdoe' });

      expect(authRepository.upsert).toHaveBeenCalledWith({
        id: '1',
        email: 'j@e.com',
        fullName: 'John',
        username: 'jdoe',
      });
      expect(result.username).toBe('jdoe');
    });

    it('throws 400 when id or email is missing', async () => {
      await expect(authService.syncProfile({ id: '1' })).rejects.toMatchObject({ statusCode: 400 });
      await expect(authService.syncProfile({ email: 'j@e.com' })).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 when username is already taken', async () => {
      authRepository.findByUsername.mockResolvedValue({ id: '2', username: 'jdoe' });
      await expect(authService.syncProfile({ id: '1', email: 'j@e.com', username: 'jdoe' })).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getMe', () => {
    it('returns profile when found', async () => {
      authRepository.findById.mockResolvedValue({ id: '1', email: 'j@e.com' });
      const result = await authService.getMe('1');
      expect(result.id).toBe('1');
    });

    it('throws 404 when profile not found', async () => {
      authRepository.findById.mockResolvedValue(null);
      await expect(authService.getMe('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('setActiveGalpon', () => {
    it('updates and returns profile', async () => {
      authRepository.updateActiveGalpon.mockResolvedValue({ id: '1', activeGalponId: 5 });
      const result = await authService.setActiveGalpon('1', 5);
      expect(result.activeGalponId).toBe(5);
    });

    it('throws 404 when profile not found', async () => {
      authRepository.updateActiveGalpon.mockResolvedValue(null);
      await expect(authService.setActiveGalpon('1', 5)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('resolveEmail', () => {
    it('resolves by email', async () => {
      authRepository.findByEmail.mockResolvedValue({ email: 'j@e.com' });
      const result = await authService.resolveEmail('J@E.COM');
      expect(result).toBe('j@e.com');
    });

    it('resolves by username', async () => {
      authRepository.findByUsername.mockResolvedValue({ email: 'j@e.com' });
      const result = await authService.resolveEmail('jdoe');
      expect(result).toBe('j@e.com');
    });

    it('throws 404 when not found by email', async () => {
      authRepository.findByEmail.mockResolvedValue(null);
      await expect(authService.resolveEmail('unknown@e.com')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 404 when not found by username', async () => {
      authRepository.findByUsername.mockResolvedValue(null);
      await expect(authService.resolveEmail('unknown')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('updateProfile', () => {
    beforeEach(() => {
      authRepository.findByUsername.mockReset();
    });

    it('updates fullName and username', async () => {
      authRepository.findByUsername.mockResolvedValue(null);
      const mockUpdate = jest.fn().mockResolvedValue({ id: '1', fullName: 'New Name', username: 'newname' });
      Profile.findByPk.mockResolvedValue({ id: '1', update: mockUpdate });

      const result = await authService.updateProfile('1', { fullName: 'New Name', username: 'newname' });
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('throws 400 when fields missing', async () => {
      await expect(authService.updateProfile('1', { fullName: '' })).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 on duplicate username', async () => {
      authRepository.findByUsername.mockResolvedValue({ id: '2', username: 'taken' });
      await expect(authService.updateProfile('1', { fullName: 'Name', username: 'taken' })).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 404 when profile not found', async () => {
      authRepository.findByUsername.mockResolvedValue(null);
      Profile.findByPk.mockResolvedValue(null);
      await expect(authService.updateProfile('1', { fullName: 'Name', username: 'new' })).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deleteAccount', () => {
    it('deletes account with valid password', async () => {
      Profile.findByPk.mockResolvedValue({ id: '1', email: 'j@e.com' });
      supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
      Galpon.findAll.mockResolvedValue([]);
      FarmMember.findAll.mockResolvedValue([]);
      Notification.destroy.mockResolvedValue(0);
      AuditLog.destroy.mockResolvedValue(0);

      await expect(authService.deleteAccount('1', 'pass')).resolves.not.toThrow();
    });

    it('throws 401 on wrong password', async () => {
      Profile.findByPk.mockResolvedValue({ id: '1', email: 'j@e.com' });
      supabase.auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid') });

      await expect(authService.deleteAccount('1', 'wrong')).rejects.toMatchObject({ statusCode: 401 });
    });
  });
});
