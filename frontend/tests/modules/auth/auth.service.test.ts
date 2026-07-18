import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
  })),
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMe fetches profile from /auth/me', async () => {
    const mockProfile = { id: '1', email: 'test@test.com', username: 'test' };
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, user: mockProfile } });

    const { authService } = await import('@/modules/auth/services/auth.service');
    const result = await authService.getMe();

    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual(mockProfile);
  });

  it('setActiveGalpon patches /auth/active-galpon', async () => {
    const mockProfile = { id: '1', activeGalponId: 5 };
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true, user: mockProfile } });

    const { authService } = await import('@/modules/auth/services/auth.service');
    const result = await authService.setActiveGalpon(5);

    expect(api.patch).toHaveBeenCalledWith('/auth/active-galpon', { galponId: 5 });
    expect(result).toEqual(mockProfile);
  });

  it('updateProfile updates user metadata and API', async () => {
    const mockProfile = { id: '1', fullName: 'Updated', username: 'updatedUser' };
    const supabaseModule = await import('@/utils/supabase/client');
    const mockUpdateUser = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabaseModule.createClient).mockReturnValue({
      auth: { updateUser: mockUpdateUser, signInWithPassword: vi.fn(), getUser: vi.fn(), signOut: vi.fn(), getSession: vi.fn(), signUp: vi.fn() },
    } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, user: mockProfile } });

    const { authService } = await import('@/modules/auth/services/auth.service');
    const result = await authService.updateProfile('Updated', 'updatedUser');

    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { fullName: 'Updated', username: 'updatedUser' } });
    expect(api.put).toHaveBeenCalledWith('/auth/profile', { fullName: 'Updated', username: 'updatedUser' });
    expect(result).toEqual(mockProfile);
  });

  it('deleteAccount posts and signs out', async () => {
    const supabaseModule = await import('@/utils/supabase/client');
    const mockSignOut = vi.fn().mockResolvedValue({});
    vi.mocked(supabaseModule.createClient).mockReturnValue({
      auth: { signOut: mockSignOut, signInWithPassword: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), getSession: vi.fn(), signUp: vi.fn() },
    } as any);
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });

    const { authService } = await import('@/modules/auth/services/auth.service');
    await authService.deleteAccount('password123');

    expect(api.post).toHaveBeenCalledWith('/auth/profile/delete', { currentPassword: 'password123' });
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('getSession returns session from supabase', async () => {
    const mockSession = { user: { id: '1' }, access_token: 'token' };
    const supabaseModule = await import('@/utils/supabase/client');
    const mockGetSession = vi.fn().mockResolvedValue({ data: { session: mockSession } });
    vi.mocked(supabaseModule.createClient).mockReturnValue({
      auth: { getSession: mockGetSession, signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), getUser: vi.fn(), updateUser: vi.fn() },
    } as any);

    const { authService } = await import('@/modules/auth/services/auth.service');
    const result = await authService.getSession();

    expect(mockGetSession).toHaveBeenCalled();
    expect(result).toEqual(mockSession);
  });
});
