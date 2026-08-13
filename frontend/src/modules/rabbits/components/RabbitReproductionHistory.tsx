'use client';

import { useQuery } from '@tanstack/react-query';
import { reproductionService } from '@/modules/reproduction/services/reproduction.service';
import { LoadingMessage } from '@/shared/ui';
import { CheckCircle2, Clock, Heart, Baby, Calendar } from 'lucide-react';

interface RabbitReproductionHistoryProps {
  rabbitId: number;
}

export function RabbitReproductionHistory({ rabbitId }: RabbitReproductionHistoryProps) {
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
      case 'monta': return 'Fase 1: Monta (Espera de palpación)';
      case 'gestacion': return 'Fase 2: Gestación';
      case 'lactancia': return 'Fase 3: Lactancia';
      default: return status;
    }
  };

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case 'monta': return <Heart size={20} className="text-pink-500" />;
      case 'gestacion': return <Calendar size={20} className="text-amber-500" />;
      case 'lactancia': return <Baby size={20} className="text-blue-500" />;
      default: return <Clock size={20} className="text-muted" />;
    }
  };

  if (reproductions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted bg-theme-surface rounded-lg border border-default border-dashed">
        <Heart className="w-12 h-12 text-slate-300 mb-3" />
        <h3 className="text-lg font-medium text-main">Sin historial reproductivo</h3>
        <p className="text-sm mt-1 max-w-sm text-center">Esta coneja aún no ha sido registrada en ningún proceso de reproducción.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-4">
      
      {/* Procesos Activos */}
      {active.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-main mb-3 uppercase tracking-wider flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            En Proceso
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {active.map(r => (
              <div key={r.id} className="bg-card p-4 rounded-xl border border-default hover:border-strong transition-colors shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 p-2.5 rounded-xl">
                      {getPhaseIcon(r.status)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-main text-[15px]">{getPhaseName(r.status)}</h4>
                      <p className="text-sm text-muted mt-1 flex items-center gap-2">
                        Pareja: {r.maleImageUrl ? (
                          <img src={r.maleImageUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                        ) : null}
                        <span className="font-medium text-main">{r.maleName || r.maleCode || 'No registrado'}</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mt-4 text-sm border-t border-black/5 pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted">Fecha de Monta:</span>
                    <span className="font-medium text-main">{new Date(r.mountDate).toLocaleDateString('es-EC')}</span>
                  </div>
                  {r.status === 'gestacion' && r.estimatedBirthDate && (
                    <div className="flex justify-between">
                      <span className="text-muted">Parto Estimado:</span>
                      <span className="font-medium text-main">{new Date(r.estimatedBirthDate).toLocaleDateString('es-EC')}</span>
                    </div>
                  )}
                  {r.status === 'lactancia' && r.estimatedBirthDate && (
                    <div className="flex justify-between">
                      <span className="text-muted">Fecha de Parto:</span>
                      <span className="font-medium text-main">{new Date(r.estimatedBirthDate).toLocaleDateString('es-EC')}</span>
                    </div>
                  )}
                  {r.status === 'lactancia' && r.bornKits != null && (
                    <div className="flex justify-between">
                      <span className="text-muted">Gazapos Nacidos:</span>
                      <span className="font-bold text-main">{r.bornKits} vivos</span>
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
          <h3 className="text-sm font-semibold text-main mb-3 uppercase tracking-wider flex items-center gap-2 mt-6">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Partos Exitosos
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {completed.map(r => (
              <div key={r.id} className="bg-card p-4 rounded-xl border border-default hover:border-strong transition-colors shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-main text-[15px]">Parto Completado</h4>
                      <p className="text-sm text-muted mt-1 flex items-center gap-2">
                        Pareja: {r.maleImageUrl ? (
                          <img src={r.maleImageUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                        ) : null}
                        <span className="font-medium text-main">{r.maleName || r.maleCode || 'No registrado'}</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mt-4 text-sm border-t border-black/5 pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted">Fecha de Monta:</span>
                    <span className="font-medium text-main">{new Date(r.mountDate).toLocaleDateString('es-EC')}</span>
                  </div>
                  {r.estimatedBirthDate && (
                    <div className="flex justify-between">
                      <span className="text-muted">Fecha de Parto:</span>
                      <span className="font-medium text-main">{new Date(r.estimatedBirthDate).toLocaleDateString('es-EC')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted">Gazapos Logrados:</span>
                    <span className="font-bold text-main">{r.bornKits || 0}</span>
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
