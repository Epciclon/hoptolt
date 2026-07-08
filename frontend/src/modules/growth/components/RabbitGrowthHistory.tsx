'use client';

import { useQuery } from '@tanstack/react-query';
import { growthService } from '../services/growth.service';
import { LoadingMessage } from '@/shared/ui';
import { LineChart, TrendingUp, Calendar, Scale } from 'lucide-react';

interface RabbitGrowthHistoryProps {
  rabbitId: number;
}

export function RabbitGrowthHistory({ rabbitId }: Readonly<RabbitGrowthHistoryProps>) {
  const { data: growths = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['growths', rabbitId],
    queryFn: () => growthService.getHistory(rabbitId),
    enabled: !!rabbitId,
  });

  const error = queryError ? (queryError as Error).message : '';

  if (loading) return <LoadingMessage message="Cargando historial médico..." />;
  if (error) return <div className="text-primary-800 py-8 text-center">{error}</div>;

  if (growths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
        <TrendingUp className="w-12 h-12 text-slate-300 mb-3" />
        <h3 className="text-lg font-medium text-slate-700">Sin registros</h3>
        <p className="text-sm mt-1 max-w-sm text-center">Este conejo aún no tiene registros de crecimiento. El sistema calculará su peso estimado conforme cumpla meses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
          <LineChart size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Curva de Crecimiento Estimado</h3>
          <p className="text-sm text-slate-500">Historial de actualizaciones automáticas de peso según la edad.</p>
        </div>
      </div>

      <div className="relative pl-6 border-l-2 border-green-100 space-y-8 py-2 ml-4">
        {growths.map((growth, index) => {
          const date = new Date(growth.recordDate);
          const isLatest = index === 0;

          return (
            <div key={growth.id} className="relative">
              {/* Timeline dot */}
              <div className={`absolute -left-[35px] w-4 h-4 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${isLatest ? 'bg-primary-500 scale-125' : 'bg-slate-300'}`} />
              
              <div className={`bg-white rounded-xl border p-4 shadow-sm transition-all ${isLatest ? 'border-primary-200 ring-1 ring-green-50' : 'border-slate-100 hover:border-slate-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg flex items-center justify-center ${isLatest ? 'bg-primary-50 text-primary-600' : 'bg-slate-50 text-slate-500'}`}>
                      <Scale size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-slate-800">{Number(growth.weight).toFixed(2)}</span>
                        <span className="text-sm font-medium text-slate-500">kg</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <Calendar size={12} />
                        {date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  
                  {isLatest && (
                    <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold whitespace-nowrap">
                      Peso Actual
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
