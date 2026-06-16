'use client';

import { useState, useEffect } from 'react';
import { vaccinationService } from '../services/vaccination.service';
import type { Vaccination } from '../types/vaccination.types';

export function VaccinationTable() {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadVaccinations();
  }, []);

  const loadVaccinations = async () => {
    try {
      setLoading(true);
      const data = await vaccinationService.getAll();
      setVaccinations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar vacunaciones');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Cargando vacunaciones...</div>;
  if (error) return <div className="text-red-600 py-8">{error}</div>;
  if (vaccinations.length === 0) return <div className="text-center py-8 text-slate-500">No hay registros de vacunación</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Código Conejo</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Vacunas</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {vaccinations.map((vaccination) => (
            <tr key={vaccination.id} className="border-b border-slate-200 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{vaccination.rabbitCode}</td>
              <td className="px-4 py-3 text-slate-600">{vaccination.vaccines.join(', ')}</td>
              <td className="px-4 py-3 text-slate-600">{new Date(vaccination.vaccinationDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
