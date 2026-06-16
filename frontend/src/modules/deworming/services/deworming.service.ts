import api from '@/lib/api';
import type { Deworming, CreateDewormingDto } from '../types/deworming.types';

export const dewormingService = {
  async getAll(): Promise<Deworming[]> {
    const { data } = await api.get<{ success: boolean; dewormings: Deworming[] }>('/dewormings');
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
