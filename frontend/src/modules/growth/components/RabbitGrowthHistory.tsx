'use client';

import { useGrowthHistory } from '../hooks/useGrowth';
import { LoadingMessage } from '@/shared/ui';
import { LineChart, Calendar, User, Cpu } from 'lucide-react';

interface RabbitGrowthHistoryProps {
  rabbitId: number;
  rabbitBirthDate?: string | Date | null;
  rabbitAge?: number;
  rabbitWeight?: string | number;
}

export function RabbitGrowthHistory({ rabbitId, rabbitBirthDate, rabbitAge, rabbitWeight }: Readonly<RabbitGrowthHistoryProps>) {
  const { growths, loading, error } = useGrowthHistory(rabbitId);

  if (loading) return <LoadingMessage message="Cargando historial de crecimiento..." />;
  if (error) return <div className="text-primary-800 py-8 text-center">{error}</div>;

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div className="w-full flex items-start sm:items-center gap-3 border-b border-default pb-3 sm:pb-4 px-1">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-50 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 mt-0.5 sm:mt-0">
          <LineChart size={18} className="sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-main leading-tight">Curva de Crecimiento Estimado</h3>
          <p className="text-xs sm:text-sm text-muted mt-1">Historial de actualizaciones de peso según la edad.</p>
        </div>
      </div>

      <div className="w-full relative pl-2.5 sm:pl-6 border-l-2 border-primary-200 dark:border-primary-900/50 space-y-4 sm:space-y-6 py-2 ml-1 sm:ml-3">
        
        {/* Siempre mostramos el "Peso y Edad Actual" arriba */}
        <div className="w-full relative">
          <div className="absolute -left-[17px] sm:-left-[35px] bg-theme-surface p-0.5 sm:p-1 rounded-full border-2 border-primary-500">
            <div className="w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full bg-primary-500" />
          </div>
          
          <div className="w-full bg-primary-50/50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 ring-1 ring-primary-50 dark:ring-primary-900 rounded-xl p-2.5 sm:p-4 shadow-sm transition-all overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              <div className="flex items-start sm:items-center gap-2.5 sm:gap-4 min-w-0">
                <div 
                  className="p-2 sm:p-3 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 shrink-0"
                  title={(!growths[0] || Number(rabbitWeight) !== Number(growths[0].weight)) || growths[0].isManual ? "Peso actualizado por usuario" : "Peso estimado por el sistema"}
                >
                  {(!growths[0] || Number(rabbitWeight) !== Number(growths[0].weight)) || growths[0].isManual ? <User size={18} className="sm:w-6 sm:h-6" /> : <Cpu size={18} className="sm:w-6 sm:h-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mb-1">
                    <span className="text-lg sm:text-2xl font-bold text-main">{Number(rabbitWeight || 0).toFixed(2)}</span>
                    <span className="text-xs sm:text-sm font-medium text-muted">kg</span>
                    <span className="opacity-50 text-xs sm:text-sm text-muted">•</span>
                    <span className="text-xs sm:text-sm font-bold text-main truncate">
                      {rabbitAge ? `Mes ${rabbitAge} de vida` : 'Al nacer'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-primary-600 dark:text-primary-400 font-medium">
                    <Calendar size={12} className="shrink-0" />
                    <span>Último peso registrado</span>
                  </div>
                </div>
              </div>
              
              <span className="self-start sm:self-center px-2 py-0.5 sm:px-3 sm:py-1 bg-primary-500 text-white rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap">
                Estado Actual
              </span>
            </div>
          </div>
        </div>

        {growths.length === 0 && (
          <div className="py-4 text-muted text-xs sm:text-sm italic text-center w-full">
            El sistema calculará el historial estimado conforme el conejo cumpla meses exactos.
          </div>
        )}

        {growths.map((growth) => {
          const date = new Date(growth.recordDate);

          let ageText = '';
          if (rabbitBirthDate) {
            const birthDate = new Date(rabbitBirthDate);
            const diffTime = Math.abs(date.getTime() - birthDate.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const months = Math.floor(diffDays / 30);
            
            if (months > 0) {
              ageText = `A los ${months} meses de edad`;
            } else {
              ageText = `Al nacer`;
            }
          }

          return (
            <div key={growth.id} className="w-full relative">
              {/* Timeline dot */}
              <div className="absolute -left-[18px] sm:-left-[35px] w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 sm:border-4 border-white dark:border-theme-surface shadow-sm flex items-center justify-center bg-slate-300 dark:bg-slate-700" />
              
              <div className="w-full bg-card rounded-xl border p-2.5 sm:p-4 shadow-sm transition-all border-default hover:border-strong overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-4 min-w-0">
                    <div className="p-2 sm:p-3 rounded-lg flex items-center justify-center bg-theme-surface text-muted shrink-0" title={growth.isManual ? "Peso actualizado por usuario" : "Peso estimado por el sistema"}>
                      {growth.isManual ? <User size={18} className="sm:w-6 sm:h-6" /> : <Cpu size={18} className="sm:w-6 sm:h-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mb-1">
                        <span className="text-lg sm:text-2xl font-bold text-main">{Number(growth.weight).toFixed(2)}</span>
                        <span className="text-xs sm:text-sm font-medium text-muted">kg</span>
                        {ageText && (
                          <>
                            <span className="opacity-50 text-xs sm:text-sm text-muted">•</span>
                            <span className="text-xs sm:text-sm font-bold text-main">{ageText}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-theme-faint font-medium">
                        <Calendar size={12} className="shrink-0" />
                        <span className="capitalize">{date.toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
