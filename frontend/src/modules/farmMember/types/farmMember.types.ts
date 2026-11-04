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

export interface AuditLogItem {
  id: number;
  action: string;
  entity: string;
  entityId: string | number;
  profileId?: string | null;
  details: {
    galponId: string | number;
    itemName?: string;
    summary?: string;
    isSystem?: boolean;
    systemActor?: string;
    before?: any;
    after?: any;
    [key: string]: any;
  };
  createdAt: string;
  profile?: {
    id: string;
    fullName: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface AuditLogsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  logs: AuditLogItem[];
}

export interface AuditLogFilters {
  profileId?: string;
  entity?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  isSystem?: boolean | string;
  source?: 'worker' | 'system';
  page?: number;
  limit?: number;
}
