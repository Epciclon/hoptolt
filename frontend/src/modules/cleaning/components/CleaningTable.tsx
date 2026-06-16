'use client';

import { useState, useEffect } from 'react';
import { cleaningService } from '../services/cleaning.service';
import type { Cleaning } from '../types/cleaning.types';

export function CleaningTable() {
  const [cleanings, setCleanings] = useState<Cleaning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCleanings();
  }, []);

  const loadCleanings = async () => {
    try {
      setLoading(true);
      const data = await cleaningService.getAll();
      setCleanings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar limpiezas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Cargando limpiezas...</div>;
  if (error) return <div className="text-red-600 py-8">{error}</div>;
  if (cleanings.length === 0) return <div className="text-center py-8 text-slate-500">No hay registros de limpieza</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Jaula</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Responsable</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {cleanings.map((cleaning) => (
            <tr key={cleaning.id} className="border-b border-slate-200 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">#{cleaning.cageNumber}</td>
              <td className="px-4 py-3 text-slate-600">{cleaning.responsible}</td>
              <td className="px-4 py-3 text-slate-600">{new Date(cleaning.cleaningDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
