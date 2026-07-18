'use client';

import { useState, useEffect } from 'react';
import { reproductionService } from '../services/reproduction.service';
import type { Reproduction } from '../types/reproduction.types';
import { Button, LoadingMessage } from '@/shared/ui';

export function ReproductionTable() {
  const [reproductions, setReproductions] = useState<Reproduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReproductions();
  }, []);

  const loadReproductions = async () => {
    try {
      setLoading(true);
      const data = await reproductionService.getAll();
      setReproductions(data.reproductions || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar reproducciones');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    try {
      await reproductionService.delete(id);
      setReproductions(reproductions.filter(r => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  if (loading) return <LoadingMessage message="Cargando reproducciones..." />;
  if (error) return <div className="text-red-600 py-8">{error}</div>;
  if (reproductions.length === 0) return <div className="text-center py-8 text-muted">No hay registros de reproducción</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-theme-surface border border-default border-b border-strong">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-main">Hembra</th>
            <th className="px-4 py-3 text-left font-semibold text-main">Macho</th>
            <th className="px-4 py-3 text-left font-semibold text-main">Fecha Monta</th>
            <th className="px-4 py-3 text-left font-semibold text-main">Fecha Estimada Parto</th>
            <th className="px-4 py-3 text-left font-semibold text-main">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {reproductions.map((reproduction) => (
            <tr key={reproduction.id} className="border-b border-strong hover:bg-theme-surface">
              <td className="px-4 py-3 font-medium text-main">{reproduction.femaleCode}</td>
              <td className="px-4 py-3 text-muted">{reproduction.maleCode || '-'}</td>
              <td className="px-4 py-3 text-muted">{new Date(reproduction.mountDate).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-muted">{new Date(reproduction.estimatedBirthDate).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(reproduction.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
