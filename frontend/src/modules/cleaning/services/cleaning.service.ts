import api from '@/lib/api';
import type { Cleaning, CreateCleaningDto } from '../types/cleaning.types';

export const cleaningService = {
  async getAll(filters?: { profileId?: string, startDate?: string, endDate?: string }): Promise<Cleaning[]> {
    const params = new URLSearchParams();
    params.append('limit', '1000');
    if (filters?.profileId) params.append('profileId', filters.profileId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const { data } = await api.get<{ success: boolean; cleanings: Cleaning[] }>(`/cleanings?${params.toString()}`);
    return data.cleanings;
  },

  async create(payload: CreateCleaningDto): Promise<Cleaning[]> {
    const { data } = await api.post<{ success: boolean; cleanings: Cleaning[] }>('/cleanings', payload);
    return data.cleanings;
  },
};
