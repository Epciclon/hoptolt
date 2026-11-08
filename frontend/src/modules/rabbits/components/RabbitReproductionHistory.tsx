'use client';

import { useQuery } from '@tanstack/react-query';
import { reproductionService } from '@/modules/reproduction/services/reproduction.service';
import type { Reproduction } from '@/modules/reproduction/types/reproduction.types';
import { LoadingMessage, RabbitAvatar } from '@/shared/ui';
import { CheckCircle2, Clock, Heart, Baby, Calendar } from 'lucide-react';

interface RabbitReproductionHistoryProps {
  rabbitId: number;
  onlyCurrent?: boolean;
}

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

interface ReproductionHistoryCardProps {
  reproduction: Reproduction;
  isCompleted: boolean;
}

function ReproductionHistoryCard({ reproduction: r, isCompleted }: Readonly<ReproductionHistoryCardProps>) {
  const iconContainerClass = isCompleted
    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : 'bg-amber-100 dark:bg-amber-500/20';

  const title = isCompleted ? 'Parto Completado' : getPhaseName(r.status);
  const icon = isCompleted ? <CheckCircle2 size={20} /> : getPhaseIcon(r.status);

  const showEstimatedBirth = !isCompleted && r.status === 'gestacion' && Boolean(r.estimatedBirthDate);
  const showActualOrCompletedBirth = (isCompleted || r.status === 'lactancia') && Boolean(r.estimatedBirthDate);
  const birthLabel = showEstimatedBirth ? 'Parto Estimado' : 'Fecha de Parto';

  return (
    <div className="w-full bg-card p-3.5 sm:p-4 rounded-xl border border-default hover:border-strong transition-colors shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`${iconContainerClass} p-2 sm:p-2.5 rounded-xl shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-main text-sm sm:text-base leading-snug">
            {title}
          </h4>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-default/50">
        <p className="text-[10px] uppercase font-bold text-muted mb-1.5 tracking-wider">
          Pareja
        </p>
        <div className="flex items-center gap-2.5 min-w-0">
          <RabbitAvatar
            imageUrl={r.maleImageUrl}
            alt={r.maleName || r.maleCode || 'Macho'}
            size="xs"
            rabbitId={r.maleId}
            rabbitCode={r.maleCode}
          />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-main truncate">
              {r.maleName || r.maleCode || 'No registrado'}
            </span>
            {r.maleCode && r.maleName && (
              <span className="text-[11px] font-medium text-muted truncate">
                {r.maleCode}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-theme-surface rounded-lg border border-default/60 mt-3">
        <div className="flex items-center justify-between sm:block min-w-0 gap-2">
          <p className="text-[10px] uppercase font-bold text-muted sm:mb-0.5 whitespace-nowrap">
            Fecha de Monta
          </p>
          <p className="text-xs sm:text-sm font-bold text-main whitespace-nowrap">
            {new Date(r.mountDate).toLocaleDateString('es-EC')}
          </p>
        </div>

        {(showEstimatedBirth || showActualOrCompletedBirth) && r.estimatedBirthDate && (
          <div className="flex items-center justify-between sm:block min-w-0 gap-2 border-t border-default/60 pt-2 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-3">
            <p className="text-[10px] uppercase font-bold text-muted sm:mb-0.5 whitespace-nowrap">
              {birthLabel}
            </p>
            <p className="text-xs sm:text-sm font-bold text-main whitespace-nowrap">
              {new Date(r.estimatedBirthDate).toLocaleDateString('es-EC')}
            </p>
          </div>
        )}

        {!isCompleted && r.status === 'lactancia' && (
          <div className="sm:col-span-2 min-w-0 border-t border-default/60 pt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold text-muted">
              Gazapos Nacidos
            </span>
            {r.bornKits !== null && r.bornKits !== undefined && r.bornKits > 0 ? (
              <span className="text-xs sm:text-sm font-bold text-main whitespace-nowrap">
                {r.bornKits} {r.bornKits === 1 ? 'vivo' : 'vivos'}
              </span>
            ) : (
              <span className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                Sin registrar
              </span>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="sm:col-span-2 min-w-0 border-t border-default/60 pt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold text-muted">
              Gazapos Logrados
            </span>
            {r.bornKits !== null && r.bornKits !== undefined && r.bornKits > 0 ? (
              <span className="text-xs sm:text-sm font-bold text-main whitespace-nowrap">
                {r.bornKits} {r.bornKits === 1 ? 'gazapo' : 'gazapos'}
              </span>
            ) : (
              <span className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                Sin registrar
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function RabbitReproductionHistory({ rabbitId, onlyCurrent = false }: Readonly<RabbitReproductionHistoryProps>) {
  const { data: reproductions = [], isLoading, error: queryError } = useQuery({
    queryKey: ['reproductions', 'female', rabbitId],
    queryFn: () => reproductionService.getByFemaleId(rabbitId),
    enabled: !!rabbitId,
  });

  if (isLoading) return <LoadingMessage message="Cargando historial de reproducciones..." />;
  
  const error = queryError ? (queryError as Error).message : null;
  if (error) return <div className="text-amber-600 py-8 text-center">{error}</div>;

  const completed = reproductions.filter(r => r.status === 'completado');
  const active = reproductions.filter(r => ['monta', 'gestacion', 'lactancia'].includes(r.status));

  if (reproductions.length === 0 || (active.length === 0 && completed.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-10 sm:py-12 px-4 sm:px-6 text-center text-muted bg-theme-surface rounded-xl border border-default border-dashed">
        <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 dark:text-slate-600 mb-3 shrink-0" />
        <h3 className="text-sm sm:text-base font-semibold text-main text-center">Sin historial reproductivo</h3>
        <p className="text-xs sm:text-sm mt-1.5 max-w-xs text-center leading-relaxed">
          Esta coneja aún no ha sido registrada en ningún proceso de reproducción.
        </p>
      </div>
    );
  }

  if (onlyCurrent) {
    const currentActive = active[0];
    const latestCompleted = completed[0];

    return (
      <div className="w-full space-y-6 animate-fade-in pb-2">
        {currentActive && (
          <section>
            <h3 className="text-xs sm:text-sm font-semibold text-main mb-3 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-amber-600" />
              Proceso Reproductivo Actual
            </h3>
            <div className="w-full grid grid-cols-1 gap-3 sm:gap-4">
              <ReproductionHistoryCard reproduction={currentActive} isCompleted={false} />
            </div>
          </section>
        )}
        {!currentActive && latestCompleted && (
          <section>
            <h3 className="text-xs sm:text-sm font-semibold text-main mb-3 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              Último Parto Registrado
            </h3>
            <div className="w-full grid grid-cols-1 gap-3 sm:gap-4">
              <ReproductionHistoryCard reproduction={latestCompleted} isCompleted={true} />
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-fade-in pb-2">
      {active.length > 0 && (
        <section>
          <h3 className="text-xs sm:text-sm font-semibold text-main mb-3 uppercase tracking-wider flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            En Proceso
          </h3>
          <div className="w-full grid grid-cols-1 gap-3 sm:gap-4">
            {active.map(r => (
              <ReproductionHistoryCard key={r.id} reproduction={r} isCompleted={false} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h3 className="text-xs sm:text-sm font-semibold text-main mb-3 uppercase tracking-wider flex items-center gap-2 mt-4 sm:mt-6">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Partos Exitosos
          </h3>
          <div className="w-full grid grid-cols-1 gap-3 sm:gap-4">
            {completed.map(r => (
              <ReproductionHistoryCard key={r.id} reproduction={r} isCompleted={true} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
