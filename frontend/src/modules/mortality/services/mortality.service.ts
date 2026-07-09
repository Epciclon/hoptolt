import api from '@/lib/api';
import type { Mortality, CreateMortalityDto } from '../types/mortality.types';

export const mortalityService = {
  async getAll(filters?: { profileId?: string, startDate?: string, endDate?: string, isKits?: boolean }): Promise<Mortality[]> {
    const params = new URLSearchParams();
    params.append('limit', '1000');
    if (filters?.isKits !== undefined) params.append('isKits', String(filters.isKits));
    if (filters?.profileId) params.append('profileId', filters.profileId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const { data } = await api.get<{ success: boolean; mortalities: Mortality[] }>(`/mortalities?${params.toString()}`);
    return data.mortalities;
  },

  async create(payload: CreateMortalityDto): Promise<Mortality> {
    const { data } = await api.post<{ success: boolean; mortality: Mortality }>('/mortalities', payload);
    return data.mortality;
  },
};
