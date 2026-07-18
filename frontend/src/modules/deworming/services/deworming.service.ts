import api from '@/lib/api';
import type { Deworming, CreateDewormingDto } from '../types/deworming.types';

export const dewormingService = {
  async getAll(filters?: { profileId?: string, startDate?: string, endDate?: string }): Promise<Deworming[]> {
    const params = new URLSearchParams();
    params.append('limit', '1000');
    if (filters?.profileId) params.append('profileId', filters.profileId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const { data } = await api.get<{ success: boolean; dewormings: Deworming[] }>(`/dewormings?${params.toString()}`);
    return data.dewormings;
  },

  async create(payload: CreateDewormingDto): Promise<Deworming[]> {
    const { data } = await api.post<{ success: boolean; dewormings: Deworming[] }>('/dewormings', payload);
    return data.dewormings;
  },

  async getGalponDewormingPeriod(): Promise<number> {
    const { data } = await api.get<{ success: boolean; dewormingPeriod: number }>('/deworming-period');
    return data.dewormingPeriod;
  },
};
