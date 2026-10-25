import api from '@/lib/api';
import type {
  Incident,
  CreateIncidentDTO,
  RespondIncidentDTO,
  IncidentCounts,
  GetIncidentsParams,
  IncidentsResponse
} from '../types/incident.types';

const BASE_URL = '/incidents';

export const incidentService = {
  async getAll(params?: GetIncidentsParams): Promise<IncidentsResponse> {
    const { data } = await api.get<{
      success: boolean;
      incidents: Incident[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
      userRole: 'owner' | 'worker';
    }>(BASE_URL, { params });

    return {
      incidents: data.incidents || [],
      pagination: data.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 },
      userRole: data.userRole || 'worker'
    };
  },

  async getCounts(): Promise<IncidentCounts> {
    const { data } = await api.get<{ success: boolean; counts: IncidentCounts }>(`${BASE_URL}/counts`);
    return data.counts;
  },

  async getById(id: number): Promise<Incident> {
    const { data } = await api.get<{ success: boolean; incident: Incident }>(`${BASE_URL}/${id}`);
    return data.incident;
  },

  async create(payload: CreateIncidentDTO): Promise<Incident> {
    const { data } = await api.post<{ success: boolean; incident: Incident }>(BASE_URL, payload);
    return data.incident;
  },

  async respond(id: number, payload: RespondIncidentDTO): Promise<Incident> {
    const { data } = await api.put<{ success: boolean; incident: Incident }>(`${BASE_URL}/${id}/respond`, payload);
    return data.incident;
  },

  async markAsRead(id: number | 'all'): Promise<{ success: boolean }> {
    const { data } = await api.put<{ success: boolean }>(`${BASE_URL}/${id}/read`);
    return data;
  },

  async delete(id: number): Promise<{ success: boolean }> {
    const { data } = await api.delete<{ success: boolean; message: string }>(`${BASE_URL}/${id}`);
    return data;
  }
};
