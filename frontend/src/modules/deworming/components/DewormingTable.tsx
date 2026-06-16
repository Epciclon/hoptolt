'use client';

import { useState, useEffect } from 'react';
import { dewormingService } from '../services/deworming.service';
import type { Deworming } from '../types/deworming.types';

export function DewormingTable() {
  const [dewormings, setDewormings] = useState<Deworming[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDewormings();
  }, []);

  const loadDewormings = async () => {
    try {
      setLoading(true);
      const data = await dewormingService.getAll();
      setDewormings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar desparasitaciones');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Cargando desparasitaciones...</div>;
  if (error) return <div className="text-red-600 py-8">{error}</div>;
  if (dewormings.length === 0) return <div className="text-center py-8 text-slate-500">No hay registros de desparasitación</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Código Conejo</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {dewormings.map((deworming) => (
            <tr key={deworming.id} className="border-b border-slate-200 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{deworming.rabbitCode}</td>
              <td className="px-4 py-3 text-slate-600">{new Date(deworming.dewormingDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
