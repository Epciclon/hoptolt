'use client';

import { useQuery } from '@tanstack/react-query';
import { reproductionService } from '@/modules/reproduction/services/reproduction.service';
import { LoadingMessage, RabbitAvatar } from '@/shared/ui';
import { CheckCircle2, Clock, Heart, Baby, Calendar } from 'lucide-react';

interface RabbitReproductionHistoryProps {
  rabbitId: number;
}

export function RabbitReproductionHistory({ rabbitId }: Readonly<RabbitReproductionHistoryProps>) {
  const { data: reproductions = [], isLoading, error: queryError } = useQuery({
    queryKey: ['reproductions', 'female', rabbitId],
    queryFn: () => reproductionService.getByFemaleId(rabbitId),
    enabled: !!rabbitId,
  });

  if (isLoading) return <LoadingMessage message="Cargando historial de reproducciones..." />;
  
  const error = queryError ? (queryError as Error).message : null;
  if (error) return <div className="text-amber-600 py-8 text-center">{error}</div>;

  // Filtrar exitosos vs activos
  const completed = reproductions.filter(r => r.status === 'completado');
  const active = reproductions.filter(r => ['monta', 'gestacion', 'lactancia'].includes(r.status));

  const getPhaseName = (status: string) => {
    switch (status) {
      case 'monta': return 'Fase 1: Monta - Espera de palpación';
      case 'gestacion': return 'Fase 2: Gestación';
      case 'lactancia': return 'Fase 3: Lactancia';
      default: return status;
    }
  };

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case 'monta': return <Heart size={20} className="text-pink-500" />;
      case 'gestacion': return <Calendar size={20} className="text-amber-500" />;
      case 'lactancia': return <Baby size={20} className="text-slate-800 dark:text-white" />;
      default: return <Clock size={20} className="text-muted" />;
    }
  };

  if (reproductions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted bg-theme-surface rounded-lg border border-default border-dashed">
        <Heart className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
        <h3 className="text-lg font-medium text-main">Sin historial reproductivo</h3>
        <p className="text-sm mt-1 max-w-sm text-center">Esta coneja aún no ha sido registrada en ningún proceso de reproducción.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-fade-in pb-2">
      {/* Procesos Activos */}
      {active.length > 0 && (
        <section>
          <h3 className="text-xs sm:text-sm font-semibold text-main mb-3 uppercase tracking-wider flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            En Proceso
          </h3>
          <div className="w-full grid grid-cols-1 gap-3 sm:gap-4">
            {active.map(r => (
              <div key={r.id} className="w-full bg-card p-3.5 sm:p-4 rounded-xl border border-default hover:border-strong transition-colors shadow-sm">
                {/* Cabecera del proceso */}
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 dark:bg-amber-500/20 p-2 sm:p-2.5 rounded-xl shrink-0">
                    {getPhaseIcon(r.status)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-main text-sm sm:text-base leading-snug">
                      {getPhaseName(r.status)}
                    </h4>
                  </div>
                </div>

                {/* Pareja: foto y nombre abajo de pareja */}
                <div className="mt-2.5 pt-2 border-t border-default/50">
                  <p className="text-[10px] uppercase font-bold text-muted mb-1.5 tracking-wider">
                    Pareja
                  </p>
                  <div className="flex items-center gap-2">
                    <RabbitAvatar
                      imageUrl={r.maleImageUrl}
                      alt={r.maleName || r.maleCode || 'Macho'}
                      size="xs"
                    />
                    <span className="text-xs sm:text-sm font-semibold text-main whitespace-nowrap">
                      {r.maleName || r.maleCode || 'No registrado'}
                    </span>
                    {r.maleCode && r.maleName && (
                      <span className="text-[11px] text-muted whitespace-nowrap">
                        [{r.maleCode}]
                      </span>
                    )}
                  </div>
                </div>

                {/* Cuadrícula de datos y fechas a 2 columnas */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 p-2.5 sm:p-3 bg-theme-surface rounded-lg border border-default/60 mt-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-muted mb-0.5 whitespace-nowrap">
                      Fecha de Monta
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-main whitespace-nowrap">
                      {new Date(r.mountDate).toLocaleDateString('es-EC')}
                    </p>
                  </div>

                  {r.status === 'gestacion' && r.estimatedBirthDate && (
                    <div className="min-w-0 border-l border-default/60 pl-2.5 sm:pl-3">
                      <p className="text-[10px] uppercase font-bold text-muted mb-0.5 whitespace-nowrap">
                        Parto Estimado
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-main whitespace-nowrap">
                        {new Date(r.estimatedBirthDate).toLocaleDateString('es-EC')}
                      </p>
                    </div>
                  )}

                  {r.status === 'lactancia' && r.estimatedBirthDate && (
                    <div className="min-w-0 border-l border-default/60 pl-2.5 sm:pl-3">
                      <p className="text-[10px] uppercase font-bold text-muted mb-0.5 whitespace-nowrap">
                        Fecha de Parto
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-main whitespace-nowrap">
                        {new Date(r.estimatedBirthDate).toLocaleDateString('es-EC')}
                      </p>
                    </div>
                  )}

                  {r.status === 'lactancia' && r.bornKits != null && (
                    <div className="col-span-2 min-w-0 border-t border-default/60 pt-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted">
                        Gazapos Nacidos
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-main">
                        {r.bornKits} vivos
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Partos Exitosos */}
      {completed.length > 0 && (
        <section>
          <h3 className="text-xs sm:text-sm font-semibold text-main mb-3 uppercase tracking-wider flex items-center gap-2 mt-4 sm:mt-6">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Partos Exitosos
          </h3>
          <div className="w-full grid grid-cols-1 gap-3 sm:gap-4">
            {completed.map(r => (
              <div key={r.id} className="w-full bg-card p-3.5 sm:p-4 rounded-xl border border-default hover:border-strong transition-colors shadow-sm">
                {/* Cabecera del parto completado */}
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2 sm:p-2.5 rounded-xl shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-main text-sm sm:text-base leading-snug">
                      Parto Completado
                    </h4>
                  </div>
                </div>

                {/* Pareja: foto y nombre abajo de pareja */}
                <div className="mt-2.5 pt-2 border-t border-default/50">
                  <p className="text-[10px] uppercase font-bold text-muted mb-1.5 tracking-wider">
                    Pareja
                  </p>
                  <div className="flex items-center gap-2">
                    <RabbitAvatar
                      imageUrl={r.maleImageUrl}
                      alt={r.maleName || r.maleCode || 'Macho'}
                      size="xs"
                    />
                    <span className="text-xs sm:text-sm font-semibold text-main whitespace-nowrap">
                      {r.maleName || r.maleCode || 'No registrado'}
                    </span>
                    {r.maleCode && r.maleName && (
                      <span className="text-[11px] text-muted whitespace-nowrap">
                        [{r.maleCode}]
                      </span>
                    )}
                  </div>
                </div>

                {/* Cuadrícula de datos a 2 columnas */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 p-2.5 sm:p-3 bg-theme-surface rounded-lg border border-default/60 mt-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-muted mb-0.5 whitespace-nowrap">
                      Fecha de Monta
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-main whitespace-nowrap">
                      {new Date(r.mountDate).toLocaleDateString('es-EC')}
                    </p>
                  </div>

                  {r.estimatedBirthDate && (
                    <div className="min-w-0 border-l border-default/60 pl-2.5 sm:pl-3">
                      <p className="text-[10px] uppercase font-bold text-muted mb-0.5 whitespace-nowrap">
                        Fecha de Parto
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-main whitespace-nowrap">
                        {new Date(r.estimatedBirthDate).toLocaleDateString('es-EC')}
                      </p>
                    </div>
                  )}

                  <div className="col-span-2 min-w-0 border-t border-default/60 pt-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted">
                      Gazapos Logrados
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-main">
                      {r.bornKits || 0} gazapos
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
