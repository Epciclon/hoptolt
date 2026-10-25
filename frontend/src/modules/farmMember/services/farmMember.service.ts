import api from '@/lib/api';
import type { FarmMember, UpdateWorkerDto } from '../types/farmMember.types';

export const farmMemberService = {
  async getMyMemberships(): Promise<FarmMember[]> {
    const { data } = await api.get<{ success: boolean; memberships: FarmMember[] }>('/farm-members/me');
    return data.memberships;
  },

  async getWorkersByGalpon(galponId: number): Promise<FarmMember[]> {
    const { data } = await api.get<{ success: boolean; workers: FarmMember[] }>(`/galpones/${galponId}/workers`);
    return data.workers;
  },

  async getAllMembersByGalpon(galponId: number): Promise<FarmMember[]> {
    const { data } = await api.get<{ success: boolean; members: FarmMember[] }>(`/galpones/${galponId}/members`);
    return data.members;
  },

  async getWorkerById(id: number): Promise<FarmMember> {
    const { data } = await api.get<{ success: boolean; worker: FarmMember }>(`/farm-members/${id}`);
    return data.worker;
  },

  async updateWorker(id: number, payload: UpdateWorkerDto): Promise<FarmMember> {
    const { data } = await api.put<{ success: boolean; worker: FarmMember }>(`/farm-members/${id}`, payload);
    return data.worker;
  },

  async removeWorker(id: number): Promise<void> {
    await api.delete(`/farm-members/${id}`);
  },

  async getAuditLogs(galponId: number, filters: import('../types/farmMember.types').AuditLogFilters = {}): Promise<import('../types/farmMember.types').AuditLogsResponse> {
    const { data } = await api.get<{ success: boolean } & import('../types/farmMember.types').AuditLogsResponse>(
      `/galpones/${galponId}/audit-logs`,
      { params: filters }
    );
    return data;
  },

  async logReportAudit(galponId: number, data: { moduleName: string; moduleLabel: string; startDate?: string; endDate?: string; format?: string }): Promise<void> {
    try {
      await api.post(`/galpones/${galponId}/reports/audit`, data);
    } catch (e) {
      console.error('Error logging report audit:', e);
    }
  }
};
