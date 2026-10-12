'use client';

import { useQuery } from '@tanstack/react-query';
import { growthService } from '../services/growth.service';
import { LoadingMessage } from '@/shared/ui';
import { LineChart, Calendar, User, Cpu } from 'lucide-react';

interface RabbitGrowthHistoryProps {
  rabbitId: number;
  rabbitBirthDate?: string | Date | null;
  rabbitAge?: number;
  rabbitWeight?: string | number;
}

export function RabbitGrowthHistory({ rabbitId, rabbitBirthDate, rabbitAge, rabbitWeight }: Readonly<RabbitGrowthHistoryProps>) {
  const { data: growths = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['growths', rabbitId],
    queryFn: () => growthService.getHistory(rabbitId),
    enabled: !!rabbitId,
  });

  const error = queryError ? (queryError as Error).message : '';

  if (loading) return <LoadingMessage message="Cargando historial médico..." />;
  if (error) return <div className="text-primary-800 py-8 text-center">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-default pb-4">
        <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400">
          <LineChart size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-main">Curva de Crecimiento Estimado</h3>
          <p className="text-sm text-muted">Historial de actualizaciones automáticas de peso según la edad.</p>
        </div>
      </div>

      <div className="relative pl-6 border-l-2 border-primary-200 dark:border-primary-900/50 space-y-8 py-2 ml-4">
        
        {/* Siempre mostramos el "Peso y Edad Actual" arriba */}
        <div className="relative">
          <div className="absolute -left-[35px] bg-theme-surface p-1 rounded-full border-2 border-primary-500">
            <div className="w-4 h-4 rounded-full bg-primary-500" />
          </div>
          
          <div className="bg-primary-50/50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 ring-1 ring-primary-50 dark:ring-primary-900 rounded-xl p-4 shadow-sm transition-all">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300"
                  title={(!growths[0] || Number(rabbitWeight) !== Number(growths[0].weight)) || growths[0].isManual ? "Peso actualizado por usuario" : "Peso estimado por el sistema"}
                >
                  {(!growths[0] || Number(rabbitWeight) !== Number(growths[0].weight)) || growths[0].isManual ? <User size={24} /> : <Cpu size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-bold text-main">{Number(rabbitWeight || 0).toFixed(2)}</span>
                    <span className="text-sm font-medium text-muted">kg</span>
                    <span className="mx-1 opacity-50 text-sm text-muted">•</span>
                    <span className="text-sm font-bold text-main">
                      {rabbitAge ? `Mes ${rabbitAge} de vida` : 'Al nacer'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 font-medium">
                    <Calendar size={12} />
                    Último peso registrado
                  </div>
                </div>
              </div>
              
              <span className="px-3 py-1 bg-primary-500 text-white rounded-full text-xs font-semibold whitespace-nowrap">
                Estado Actual
              </span>
            </div>
          </div>
        </div>

        {growths.length === 0 && (
          <div className="py-4 text-muted text-sm italic">
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
            <div key={growth.id} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[35px] w-4 h-4 rounded-full border-4 border-white dark:border-theme-surface shadow-sm flex items-center justify-center bg-slate-300 dark:bg-slate-700" />
              
              <div className="bg-card rounded-xl border p-4 shadow-sm transition-all border-default hover:border-strong">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg flex items-center justify-center bg-theme-surface text-muted" title={growth.isManual ? "Peso actualizado por usuario" : "Peso estimado por el sistema"}>
                      {growth.isManual ? <User size={24} /> : <Cpu size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-main">{Number(growth.weight).toFixed(2)}</span>
                        <span className="text-sm font-medium text-muted">kg</span>
                        {ageText && (
                          <>
                            <span className="mx-1 opacity-50 text-sm text-muted">•</span>
                            <span className="text-sm font-bold text-main">{ageText}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-theme-faint font-medium">
                        <Calendar size={12} />
                        {date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
