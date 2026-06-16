import type { Profile } from '../../auth/types/auth.types';
import type { Galpon } from '../../galpones/types/galpon.types';

export interface WorkerPermission {
  id: number;
  farmMemberId: number;
  moduleName: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface WorkerCage {
  id: number;
  farmMemberId: number;
  cageId: number;
  cage?: any; // Para mantenerlo simple, luego se tipará mejor
}

export interface FarmMember {
  id: number;
  galponId: number;
  profileId: number;
  role: 'owner' | 'worker';
  status: 'active' | 'inactive';
  createdAt: string;
  profile?: Profile;
  galpon?: Galpon;
  permissions?: WorkerPermission[];
  assignedCages?: WorkerCage[];
}

export interface UpdateWorkerDto {
  permissions?: Omit<WorkerPermission, 'id' | 'farmMemberId'>[];
  cageIds?: number[];
}
