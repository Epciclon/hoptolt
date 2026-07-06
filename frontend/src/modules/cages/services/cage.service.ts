import api from '@/lib/api';
import type { Cage, CreateCageDto, UpdateCageDto } from '../types/cage.types';

export interface GetCagesParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
}

export interface CagesResponse {
  cages: Cage[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const cageService = {
  async getAll(params?: GetCagesParams): Promise<CagesResponse> {
    const { data } = await api.get<{ success: boolean; cages: Cage[]; pagination: any }>('/cages', { params });
    return { cages: data.cages, pagination: data.pagination };
  },

  async getById(id: number): Promise<Cage> {
    const { data } = await api.get<{ success: boolean; cage: Cage }>(`/cages/${id}`);
    return data.cage;
  },

  async getByNumber(number: number): Promise<Cage> {
    const { cages } = await this.getAll({ search: number.toString() });
    const cage = cages.find(c => c.number === number);
    if (!cage) throw new Error(`Jaula #${number} no encontrada`);
    return cage;
  },

  async create(payload: CreateCageDto): Promise<Cage> {
    const { data } = await api.post<{ success: boolean; cage: Cage }>('/cages', payload);
    return data.cage;
  },

  async update(id: number, payload: UpdateCageDto): Promise<Cage> {
    const { data } = await api.put<{ success: boolean; cage: Cage }>(`/cages/${id}`, payload);
    return data.cage;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/cages/${id}`);
  },
};
