import api from '@/lib/api';
import type { Feeding, CreateFeedingDto } from '../types/feeding.types';

export const feedingService = {
  async getAll(filters?: { profileId?: string, startDate?: string, endDate?: string }): Promise<Feeding[]> {
    const params = new URLSearchParams();
    params.append('limit', '1000');
    if (filters?.profileId) params.append('profileId', filters.profileId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const { data } = await api.get<{ success: boolean; feedings: Feeding[] }>(`/feedings?${params.toString()}`);
    return data.feedings;
  },

  async getFoodTypes(): Promise<string[]> {
    const { data } = await api.get<{ success: boolean; foodTypes: string[] }>('/feedings/food-types');
    return data.foodTypes;
  },

  async create(payload: CreateFeedingDto): Promise<Feeding[]> {
    const { data } = await api.post<{ success: boolean; feedings: Feeding[] }>('/feedings', payload);
    return data.feedings;
  },
};
