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

describe('invitationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMyPendingInvitations returns pending invitations', async () => {
    const mockInvitations = [{ id: 1, token: 'abc', status: 'pending' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, invitations: mockInvitations } });

    const { invitationService } = await import('@/modules/invitation/services/invitation.service');
    const result = await invitationService.getMyPendingInvitations();

    expect(api.get).toHaveBeenCalledWith('/invitations/me');
    expect(result).toEqual(mockInvitations);
  });

  it('getInvitationsByGalpon fetches invitations for a galpon', async () => {
    const mockInvitations = [{ id: 1, token: 'xyz', email: 'test@test.com' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, invitations: mockInvitations } });

    const { invitationService } = await import('@/modules/invitation/services/invitation.service');
    const result = await invitationService.getInvitationsByGalpon(1);

    expect(api.get).toHaveBeenCalledWith('/galpones/1/invitations');
    expect(result).toEqual(mockInvitations);
  });

  it('createInvitation creates a new invitation', async () => {
    const dto = { email: 'worker@test.com', role: 'Trabajador' };
    const mockInvitation = { id: 1, token: 'new-token', ...dto };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, invitation: mockInvitation } });

    const { invitationService } = await import('@/modules/invitation/services/invitation.service');
    const result = await invitationService.createInvitation(1, dto as any);

    expect(api.post).toHaveBeenCalledWith('/galpones/1/invitations', dto);
    expect(result).toEqual(mockInvitation);
  });

  it('acceptInvitation accepts an invitation by token', async () => {
    const mockInvitation = { id: 1, token: 'abc', status: 'accepted' };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, invitation: mockInvitation } });

    const { invitationService } = await import('@/modules/invitation/services/invitation.service');
    const result = await invitationService.acceptInvitation('abc');

    expect(api.post).toHaveBeenCalledWith('/invitations/abc/accept');
    expect(result.status).toBe('accepted');
  });

  it('revokeInvitation deletes an invitation by token', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });

    const { invitationService } = await import('@/modules/invitation/services/invitation.service');
    await invitationService.revokeInvitation('abc');

    expect(api.delete).toHaveBeenCalledWith('/invitations/abc');
  });
});
