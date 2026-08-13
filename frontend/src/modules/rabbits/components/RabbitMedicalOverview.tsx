'use client';

import { useDeworming } from '@/modules/deworming/hooks/useDeworming';
import { useVaccination } from '@/modules/vaccination/hooks/useVaccination';
import type { Rabbit } from '../types/rabbit.types';
import { Activity, Shield } from 'lucide-react';
import { useMemo } from 'react';

interface RabbitMedicalOverviewProps {
  rabbit: Rabbit;
}

export function RabbitMedicalOverview({ rabbit }: RabbitMedicalOverviewProps) {
  // Consultamos sin filtros específicos de conejo
  const { dewormings, dewormingPeriod, loading: loadingDeworm } = useDeworming({});
  const { vaccinations, galponVaccines, loading: loadingVac } = useVaccination({});

  const { dewormingData, nextVaccinations } = useMemo(() => {
    let nextDewormDate: Date | null = null;
    let dewormDiffDays: number | null = null;
    const lastDeworming = dewormings.length > 0 ? dewormings[0] : null;

    if (lastDeworming && dewormingPeriod) {
      const date = new Date(lastDeworming.dewormingDate);
      const nextDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
      nextDate.setDate(nextDate.getDate() + dewormingPeriod);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextDateMid = new Date(nextDate);
      nextDateMid.setHours(0, 0, 0, 0);

      const diffTime = nextDateMid.getTime() - today.getTime();
      dewormDiffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      nextDewormDate = nextDate;
    }

    // 2. Calcular Próximas Vacunaciones (todas las del conejo)
    const myVaccinations = vaccinations.filter(v => v.rabbitId === rabbit.id);
    
    // Diccionario para guardar la última fecha de aplicación de cada vacuna
    const latestVaccinesMap = new Map<string, Date>();
    
    for (const record of myVaccinations) {
      const recordDate = new Date(record.vaccinationDate);
      for (const vName of record.vaccines) {
        // Normalizamos el nombre para evitar problemas de mayúsculas o espacios extra
        const normalizedName = vName.trim().toLowerCase();
        const existingDate = latestVaccinesMap.get(normalizedName);
        if (!existingDate || recordDate > existingDate) {
          latestVaccinesMap.set(normalizedName, recordDate);
        }
      }
    }

    const nextVaccinationsList: { name: string, originalName: string, nextDate: Date | null, diffDays: number | null }[] = [];

    for (const [normalizedName, lastDate] of latestVaccinesMap.entries()) {
      // Find case-insensitive match in galponVaccines
      const vConfig = galponVaccines.find(gv => gv.name.trim().toLowerCase() === normalizedName);
      const originalName = vConfig ? vConfig.name : (normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1));
      
      if (!vConfig) {
        nextVaccinationsList.push({ name: normalizedName, originalName, nextDate: null, diffDays: null });
        continue;
      }

      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + vConfig.period);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextDateMid = new Date(nextDate);
      nextDateMid.setHours(0, 0, 0, 0);

      const diffTime = nextDateMid.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      nextVaccinationsList.push({ name: normalizedName, originalName, nextDate, diffDays });
    }

    return {
      dewormingData: { nextDewormDate, dewormDiffDays },
      nextVaccinations: nextVaccinationsList
    };
  }, [dewormings, dewormingPeriod, vaccinations, galponVaccines, rabbit.id]);

  if (loadingDeworm || loadingVac) {
    return (
      <>
        <div className="animate-pulse bg-card p-5 rounded-xl border border-strong shadow-sm h-32 flex items-center justify-center text-muted">Calculando...</div>
        <div className="animate-pulse bg-card p-5 rounded-xl border border-strong shadow-sm h-32 flex items-center justify-center text-muted">Calculando...</div>
      </>
    );
  }

  const { nextDewormDate, dewormDiffDays } = dewormingData;

  return (
    <>
      <div className="bg-card p-5 rounded-xl border border-strong shadow-sm">
        <h4 className="text-sm font-semibold text-main mb-4 uppercase tracking-wider flex items-center gap-2">
          <Activity size={16} className="text-primary-600" /> Desparasitación
        </h4>
        <div className="space-y-3 text-sm">
          {(() => {
            if (!nextDewormDate) return <span className="text-xs text-muted block pb-2 border-b border-slate-50">Sin historial reciente o período configurado</span>;
            return (
              <>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-muted">Estado:</span>
                  {dewormDiffDays! > 0 ? (
                    <span className="font-bold text-main">Faltan {dewormDiffDays} día{dewormDiffDays !== 1 ? 's' : ''}</span>
                  ) : dewormDiffDays === 0 ? (
                    <span className="font-bold text-primary-600">¡Toca hoy!</span>
                  ) : (
                    <span className="font-bold text-emerald-600">Lista para dosis</span>
                  )}
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-muted">Próxima Fecha:</span>
                  <span className="font-medium text-main">{nextDewormDate.toLocaleDateString('es-EC')}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="bg-card p-5 rounded-xl border border-strong shadow-sm">
        <h4 className="text-sm font-semibold text-main mb-4 uppercase tracking-wider flex items-center gap-2">
          <Shield size={16} className="text-primary-600" /> Vacunación
        </h4>
        <div className="space-y-3 text-sm">
          {nextVaccinations.length > 0 ? (
            nextVaccinations.map(vac => (
              <div key={vac.name} className="flex justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                <span className="text-muted">{vac.originalName}:</span>
                {(() => {
                  if (!vac.nextDate) return <span className="font-medium text-emerald-600">Aplicada</span>;
                  if (vac.diffDays! > 0) return <span className="font-bold text-main">En {vac.diffDays} día(s)</span>;
                  if (vac.diffDays === 0) return <span className="font-bold text-primary-600">Hoy</span>;
                  return <span className="font-bold text-emerald-600">Lista para dosis</span>;
                })()}
              </div>
            ))
          ) : (
            <span className="text-xs text-muted block pb-2 border-b border-slate-50">Sin vacunas aplicadas</span>
          )}
        </div>
      </div>
    </>
  );
}
