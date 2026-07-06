import api from '@/lib/api';
import type { Mortality, CreateMortalityDto } from '../types/mortality.types';

export const mortalityService = {
  async getAll(limit?: number, isKits?: boolean): Promise<Mortality[]> {
    let url = limit ? `/mortalities?limit=${limit}` : '/mortalities?limit=100';
    if (isKits !== undefined) {
      url += `&isKits=${isKits}`;
    }
    const { data } = await api.get<{ success: boolean; mortalities: Mortality[] }>(url);
    return data.mortalities;
  },

  async create(payload: CreateMortalityDto): Promise<Mortality> {
    const { data } = await api.post<{ success: boolean; mortality: Mortality }>('/mortalities', payload);
    return data.mortality;
  },
};
