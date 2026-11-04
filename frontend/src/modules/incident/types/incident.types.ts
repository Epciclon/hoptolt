export type IncidentStatus = 'pending' | 'reviewed' | 'resolved';

export interface Incident {
  id: number;
  galponId: number;
  profileId: string;
  module?: string | null;
  cageId?: number | null;
  rabbitId?: number | null;
  category: string;
  title: string;
  description: string;
  status: IncidentStatus;
  workerRead: boolean;
  ownerRead: boolean;
  ownerResponse?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    id: string;
    fullName: string;
    username: string;
    email: string;
  };
  reviewer?: {
    id: string;
    fullName: string;
    username: string;
    email: string;
  };
  cage?: {
    id: number;
    number: number;
    type: string;
  };
  cages?: Array<{
    id: number;
    number: number;
    type: string;
  }>;
  rabbit?: {
    id: number;
    code: string;
    sex?: string;
  };
}

export interface CreateIncidentDTO {
  module?: string;
  cageId?: number;
  cageIds?: number[];
  rabbitId?: number;
  category: string;
  title: string;
  description: string;
}

export interface RespondIncidentDTO {
  ownerResponse: string;
  status?: IncidentStatus;
}

export interface IncidentCounts {
  role: 'owner' | 'worker';
  total: number;
  pending: number;
  reviewed?: number;
  unread: number;
}

export interface GetIncidentsParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  module?: string;
  search?: string;
  enabled?: boolean;
}

export interface IncidentsResponse {
  incidents: Incident[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  userRole: 'owner' | 'worker';
}
