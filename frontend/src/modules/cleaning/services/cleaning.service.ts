import api from '@/lib/api';
import type { Cleaning, CreateCleaningDto } from '../types/cleaning.types';

export const cleaningService = {
  async getAll(): Promise<Cleaning[]> {
    const { data } = await api.get<{ success: boolean; cleanings: Cleaning[] }>('/cleanings');
    return data.cleanings;
  },

  async create(payload: CreateCleaningDto): Promise<Cleaning[]> {
    const { data } = await api.post<{ success: boolean; cleanings: Cleaning[] }>('/cleanings', payload);
    return data.cleanings;
  },
};
