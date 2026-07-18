import api from '@/lib/api';
import type { Invitation, CreateInvitationDto } from '../types/invitation.types';

export const invitationService = {
  async getMyPendingInvitations(): Promise<Invitation[]> {
    const { data } = await api.get<{ success: boolean; invitations: Invitation[] }>('/invitations/me');
    return data.invitations;
  },

  async getInvitationsByGalpon(galponId: number): Promise<Invitation[]> {
    const { data } = await api.get<{ success: boolean; invitations: Invitation[] }>(`/galpones/${galponId}/invitations`);
    return data.invitations;
  },

  async createInvitation(galponId: number, payload: CreateInvitationDto): Promise<Invitation> {
    const { data } = await api.post<{ success: boolean; invitation: Invitation }>(`/galpones/${galponId}/invitations`, payload);
    return data.invitation;
  },

  async acceptInvitation(token: string): Promise<Invitation> {
    const { data } = await api.post<{ success: boolean; invitation: Invitation }>(`/invitations/${token}/accept`);
    return data.invitation;
  },

  async revokeInvitation(token: string): Promise<void> {
    await api.delete(`/invitations/${token}`);
  }
};
