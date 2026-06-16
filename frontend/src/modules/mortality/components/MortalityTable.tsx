'use client';

import { useState, useEffect } from 'react';
import { mortalityService } from '../services/mortality.service';
import type { Mortality } from '../types/mortality.types';

export function MortalityTable() {
  const [mortalities, setMortalities] = useState<Mortality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMortalities();
  }, []);

  const loadMortalities = async () => {
    try {
      setLoading(true);
      const data = await mortalityService.getAll();
      setMortalities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar mortalidades');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Cargando mortalidades...</div>;
  if (error) return <div className="text-red-600 py-8">{error}</div>;
  if (mortalities.length === 0) return <div className="text-center py-8 text-slate-500">No hay registros de mortalidad</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Código Conejo</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Causa</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Reporta la baja</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {mortalities.map((mortality) => (
            <tr key={mortality.id} className="border-b border-slate-200 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">
                {mortality.rabbitCode}
                {mortality.rabbitName && mortality.rabbitName !== 'N/A' && ` - ${mortality.rabbitName}`}
              </td>
              <td className="px-4 py-3 text-slate-600">{mortality.cause}</td>
              <td className="px-4 py-3 text-slate-600">{mortality.responsible}</td>
              <td className="px-4 py-3 text-slate-600">{new Date(mortality.deathDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
