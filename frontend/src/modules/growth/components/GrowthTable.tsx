'use client';

import { useState, useEffect } from 'react';
import { growthService } from '../services/growth.service';
import type { Growth } from '../types/growth.types';

export function GrowthTable() {
  const [growths, setGrowths] = useState<Growth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGrowths();
  }, []);

  const loadGrowths = async () => {
    try {
      setLoading(true);
      const data = await growthService.getAll();
      setGrowths(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar crecimientos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Cargando crecimientos...</div>;
  if (error) return <div className="text-red-600 py-8">{error}</div>;
  if (growths.length === 0) return <div className="text-center py-8 text-slate-500">No hay registros de crecimiento</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Código Conejo</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Peso (kg)</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {growths.map((growth) => (
            <tr key={growth.id} className="border-b border-slate-200 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{growth.rabbitCode}</td>
              <td className="px-4 py-3 text-slate-600">{growth.weight.toFixed(2)}</td>
              <td className="px-4 py-3 text-slate-600">{new Date(growth.recordDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
