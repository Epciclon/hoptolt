import type { Galpon } from '../../galpones/types/galpon.types';

export interface Invitation {
  id: number;
  galponId: number;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: string;
  galpon?: Galpon;
  inviter?: {
    id: string;
    fullName: string;
    username: string;
  };
}

export interface CreateInvitationDto {
  email: string;
}
