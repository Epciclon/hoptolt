import api from '@/lib/api';
import type { Genealogy, GenealogyTree, RegisterGenealogyDto, UpdateGenealogyDto } from '../types/genealogy.types';

export const genealogyService = {
  async register(payload: RegisterGenealogyDto): Promise<Genealogy> {
    const { data } = await api.post<{ success: boolean; genealogy: Genealogy }>('/genealogies', payload);
    return data.genealogy;
  },

  async getByRabbitId(rabbitId: number): Promise<Genealogy> {
    const { data } = await api.get<{ success: boolean; genealogy: Genealogy }>(`/genealogies/${rabbitId}`);
    return data.genealogy;
  },

  async getAll(): Promise<Genealogy[]> {
    const { data } = await api.get<{ success: boolean; genealogies: Genealogy[] }>('/genealogies');
    return data.genealogies;
  },

  async getTree(rabbitId: number, levels?: number): Promise<GenealogyTree> {
    const { data } = await api.get<{ success: boolean; tree: GenealogyTree }>(`/genealogies/${rabbitId}/tree`, {
      params: { levels: levels || 3 }
    });
    return data.tree;
  },

  async edit(rabbitId: number, payload: UpdateGenealogyDto): Promise<Genealogy> {
    const { data } = await api.put<{ success: boolean; genealogy: Genealogy }>(`/genealogies/${rabbitId}`, payload);
    return data.genealogy;
  },

  async checkConsanguinity(id1: number, id2: number): Promise<boolean> {
    const { data } = await api.get<{ success: boolean; areRelated: boolean }>(`/genealogies/check-consanguinity/${id1}/${id2}`);
    return data.areRelated;
  },

  async delete(rabbitId: number): Promise<void> {
    await api.delete(`/genealogies/${rabbitId}`);
  }
};
