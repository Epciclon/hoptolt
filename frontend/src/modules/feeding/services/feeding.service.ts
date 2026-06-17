import api from '@/lib/api';
import type { Feeding, CreateFeedingDto } from '../types/feeding.types';

export const feedingService = {
  async getAll(): Promise<Feeding[]> {
    const { data } = await api.get<{ success: boolean; feedings: Feeding[] }>('/feedings?limit=1000');
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
