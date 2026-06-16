'use client';

import { useState, useEffect, useCallback } from 'react';
import { genealogyService } from '../services/genealogy.service';
import type { Genealogy, GenealogyTree } from '../types/genealogy.types';

export function useGenealogy() {
  const [genealogies, setGenealogies] = useState<Genealogy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenealogies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await genealogyService.getAll();
      setGenealogies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar genealogías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGenealogies();
  }, [fetchGenealogies]);

  const deleteGenealogy = async (rabbitId: number): Promise<boolean> => {
    try {
      await genealogyService.delete(rabbitId);
      setGenealogies(prev => prev.filter(g => g.rabbitId !== rabbitId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar genealogía');
      return false;
    }
  };

  const getTree = async (rabbitId: number, levels?: number): Promise<GenealogyTree | null> => {
    try {
      setError(null);
      return await genealogyService.getTree(rabbitId, levels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar árbol genealógico');
      return null;
    }
  };

  const editGenealogy = async (rabbitId: number, data: { fatherId?: number; motherId?: number }): Promise<boolean> => {
    try {
      setError(null);
      await genealogyService.edit(rabbitId, data);
      await fetchGenealogies();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al editar genealogía');
      return false;
    }
  };

  return { genealogies, loading, error, fetchGenealogies, deleteGenealogy, getTree, editGenealogy };
}
