import api from '@/lib/api';
import type { Rabbit, CreateRabbitDto, UpdateRabbitDto } from '../types/rabbit.types';

export interface GetRabbitsParams {
  page?: number;
  limit?: number;
  search?: string;
  race?: string;
  sex?: string;
  purpose?: string;
}

export interface RabbitsResponse {
  rabbits: Rabbit[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const rabbitService = {
  async getAll(params?: GetRabbitsParams): Promise<RabbitsResponse> {
    const { data } = await api.get<{ success: boolean; rabbits: Rabbit[]; pagination: any }>('/rabbits', { params });
    return { rabbits: data.rabbits, pagination: data.pagination };
  },

  async getById(id: number): Promise<Rabbit> {
    const { data } = await api.get<{ success: boolean; rabbit: Rabbit }>(`/rabbits/${id}`);
    return data.rabbit;
  },

  async create(payload: CreateRabbitDto): Promise<Rabbit> {
    const { data } = await api.post<{ success: boolean; rabbit: Rabbit }>('/rabbits', payload);
    return data.rabbit;
  },

  async update(id: number, payload: UpdateRabbitDto): Promise<Rabbit> {
    const { data } = await api.put<{ success: boolean; rabbit: Rabbit }>(`/rabbits/${id}`, payload);
    return data.rabbit;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/rabbits/${id}`);
  },

  async getPotentialFathers(): Promise<Rabbit[]> {
    const { data } = await api.get<{ success: boolean; fathers: Rabbit[] }>('/rabbits/potential-fathers');
    return data.fathers;
  },

  async getPotentialMothers(): Promise<Rabbit[]> {
    const { data } = await api.get<{ success: boolean; mothers: Rabbit[] }>('/rabbits/potential-mothers');
    return data.mothers;
  },

  async getByCode(code: string): Promise<Rabbit> {
    const { data } = await api.get<{ success: boolean; rabbits: Rabbit[] }>('/rabbits');
    const rabbit = data.rabbits.find(r => r.code === code);
    if (!rabbit) throw new Error('Conejo no encontrado');
    return rabbit;
  },

  async suggestName(sex: string): Promise<string> {
    const { data } = await api.get<{ success: boolean; name: string }>('/rabbits/suggest-name', { params: { sex } });
    return data.name;
  },
};
