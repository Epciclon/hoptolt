import api from '@/lib/api';
import type { Galpon, CreateGalponDto, UpdateGalponDto } from '../types/galpon.types';

export const galponService = {
  async getAll(): Promise<Galpon[]> {
    const { data } = await api.get<{ success: boolean; galpones: Galpon[] }>('/galpones');
    return data.galpones;
  },

  async getById(id: number): Promise<Galpon> {
    const { data } = await api.get<{ success: boolean; galpon: Galpon }>(`/galpones/${id}`);
    return data.galpon;
  },

  async create(payload: CreateGalponDto): Promise<Galpon> {
    const { data } = await api.post<{ success: boolean; galpon: Galpon }>('/galpones', payload);
    return data.galpon;
  },

  async update(id: number, payload: UpdateGalponDto): Promise<Galpon> {
    const { data } = await api.put<{ success: boolean; galpon: Galpon }>(`/galpones/${id}`, payload);
    return data.galpon;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/galpones/${id}`);
  },

  async getActive(): Promise<Galpon> {
    const { data } = await api.get<{ success: boolean; galpon: Galpon }>('/galpones/active');
    return data.galpon;
  },

  async setActive(id: number): Promise<void> {
    await api.post(`/galpones/${id}/set-active`, {});
  },
};
