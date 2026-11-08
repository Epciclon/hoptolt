'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { farmMemberService } from '../services/farmMember.service';
import type { AuditLogItem, AuditLogFilters } from '../types/farmMember.types';
import { SectionMessage } from '@/shared/ui';
import { Pagination } from '@/shared/ui/Pagination';
import { Filter, Sparkles } from 'lucide-react';
import { type AuditDiffItem, AUDIT_IGNORED_DIFF_KEYS, useAuditLogsRealtime, AuditDateFilters, AuditClearFiltersButton, AuditFallbackBeforeAfter, AuditStandardDiffValue, AuditLogListCard, AuditLogDetailDialog } from './AuditLogShared';

interface SystemAuditLogTabProps {
  galponId: number;
}

const ENTITY_LABELS: Record<string, string> = {
  reproduction: 'Reproducción',
  growth: 'Crecimiento',
  feeding: 'Alimentación'
};

const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  'Paso a gestación': {
    label: 'Paso a gestación',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/40'
  },
  'Paso a lactancia': {
    label: 'Paso a lactancia',
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40'
  },
  'Cálculo de crecimiento': {
    label: 'Cálculo de crecimiento',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/40'
  },
  'Turno cerrado con pendientes': {
    label: 'Turno con pendientes',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/40'
  }
};

const FIELD_LABELS: Record<string, string> = {
  age: 'Edad en meses',
  weight: 'Peso estimado',
  shift: 'Turno',
  date: 'Fecha del turno',
  status: 'Estado',
  unfedCount: 'Total sin alimentar',
  workerName: 'Trabajador encargado',
  workerId: 'ID del trabajador',
  cages: 'Jaulas sin alimentar',
  itemName: 'Elemento afectado',
  rabbitCode: 'Código de conejo',
  rabbitName: 'Nombre de conejo'
};

function formatValue(key: string, val: any): string {
  if (val === null || val === undefined || val === '') return 'Ninguno';
  if (key === 'shift') {
    const str = String(val).trim();
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : 'Ninguno';
  }
  if (key === 'weight') {
    const num = Number(val);
    if (!Number.isNaN(num)) return `${num} kg`;
    return String(val);
  }
  if (key === 'age') {
    const num = Number(val);
    if (!Number.isNaN(num)) return `${num} meses`;
    return String(val);
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return 'Ninguno';
    return val.map((v) => {
      if (typeof v === 'object' && v?.number !== undefined) return `Jaula ${v.number}`;
      if (typeof v === 'number' || !Number.isNaN(Number(v))) return `Jaula ${v}`;
      return String(v);
    }).join(', ');
  }
  if (typeof val === 'number') return String(val);
  return String(val).trim();
}

function shouldSkipGrowthWeight(action: string | undefined, key: string, aVal: any, aStr?: string): boolean {
  if (action !== 'Cálculo de crecimiento' || key !== 'weight') {
    return false;
  }
  if (aVal === undefined || aVal === null || aVal === '') {
    return true;
  }
  return aStr === 'Ninguno';
}

function computeDiff(before: any, after: any, action?: string): AuditDiffItem[] {
  const b = before && typeof before === 'object' ? before : {};
  const a = after && typeof after === 'object' ? after : {};
  const allKeys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));

  const changed: AuditDiffItem[] = [];

  for (const k of allKeys) {
    if (AUDIT_IGNORED_DIFF_KEYS.has(k)) continue;

    const bVal = b[k];
    const aVal = a[k];

    if (shouldSkipGrowthWeight(action, k, aVal)) {
      continue;
    }

    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      const bStr = formatValue(k, bVal);
      const aStr = formatValue(k, aVal);

      if (shouldSkipGrowthWeight(action, k, aVal, aStr)) {
        continue;
      }

      changed.push({
        key: k,
        label: FIELD_LABELS[k] || k,
        beforeVal: bStr,
        afterVal: aStr
      });
    }
  }

  return changed;
}

function renderDetailsView(log: AuditLogItem) {
  const { details, action } = log;
  const before = details?.before;
  const after = details?.after;

  if (before && after) {
    const changed = computeDiff(before, after, action);

    return (
      <div className="space-y-2.5">
        <span className="text-xs font-semibold text-main uppercase tracking-wider block">
          Atributos modificados
        </span>

        {changed.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {changed.map((item) => (
              <div key={item.key} className="bg-theme-surface border border-default rounded-xl p-3 shadow-2xs flex flex-col justify-between gap-2">
                <span className="font-semibold text-muted text-xs block">{item.label}</span>
                <AuditStandardDiffValue beforeVal={item.beforeVal} afterVal={item.afterVal} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted">No se detectaron diferencias en los atributos principales</p>
        )}
      </div>
    );
  }

  if (details && typeof details === 'object') {
    const relevantKeys = Object.keys(details).filter(k => 
      !['id', 'galponId', 'isSystem', 'systemActor', 'summary', 'before', 'after', 'itemName'].includes(k)
    );

    if (relevantKeys.length > 0) {
      return (
        <div className="space-y-2.5">
          <span className="text-xs font-semibold text-main uppercase tracking-wider block">
            Detalles del proceso
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relevantKeys.map((k) => (
              <div key={k} className="bg-theme-surface border border-default rounded-xl p-3 text-xs shadow-2xs">
                <span className="font-semibold text-muted block mb-1.5">{FIELD_LABELS[k] || k}</span>
                {k === 'cages' && Array.isArray(details[k]) && details[k].length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {details[k].map((cageVal: any) => {
                      const num = typeof cageVal === 'object' && cageVal?.number !== undefined ? cageVal.number : cageVal;
                      return (
                        <span
                          key={String(num)}
                          className="min-w-[2.25rem] h-8 px-2.5 rounded-md text-xs font-semibold border bg-card text-main border-default shadow-sm inline-flex items-center justify-center"
                          title={`Jaula ${num}`}
                        >
                          {num}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="font-medium text-main text-xs">{formatValue(k, details[k])}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  return <AuditFallbackBeforeAfter before={before} after={after} />;
}

export function SystemAuditLogTab({ galponId }: Readonly<SystemAuditLogTabProps>) {
  const [page, setPage] = useState(1);
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<AuditLogItem | null>(null);

  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filters: AuditLogFilters = {
    entity: selectedEntity || undefined,
    action: selectedAction || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    isSystem: true,
    page,
    limit: 15
  };

  const { data, isLoading } = useQuery({
    queryKey: ['systemAuditLogs', galponId, filters],
    queryFn: () => farmMemberService.getAuditLogs(galponId, filters),
    enabled: Boolean(galponId),
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: false
  });

  const logs = data?.logs || [];
  const totalPages = data?.totalPages || 1;
  const loading = isLoading && !data;

  useAuditLogsRealtime(galponId, 'realtime_system_audit_logs', 'systemAuditLogs');

  const handleResetFilters = () => {
    setSelectedEntity('');
    setSelectedAction('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(selectedEntity || selectedAction || startDate || endDate);

  return (
    <div className="space-y-4">
      <SectionMessage message="Registro automático de acciones ejecutadas por el sistema HopTolt en este galpón." />

      <div className="bg-card rounded-xl p-4 border border-strong shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-main mb-1">
          <Filter size={16} className="text-primary-500" />
          <span>Filtros de búsqueda</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="filter-process-select" className="block text-xs font-medium text-muted mb-1">Proceso</label>
            <select
              id="filter-process-select"
              value={selectedEntity}
              onChange={(e) => { setSelectedEntity(e.target.value); setPage(1); }}
              className="w-full text-sm bg-theme-surface dark:bg-slate-900 border border-default rounded-lg px-3 py-2 text-main dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="" className="bg-card dark:bg-slate-900 text-main">Todos los procesos</option>
              <option value="reproduction" className="bg-card dark:bg-slate-900 text-main">Reproducción</option>
              <option value="growth" className="bg-card dark:bg-slate-900 text-main">Crecimiento</option>
              <option value="feeding" className="bg-card dark:bg-slate-900 text-main">Alimentación</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-action-select" className="block text-xs font-medium text-muted mb-1">Acción</label>
            <select
              id="filter-action-select"
              value={selectedAction}
              onChange={(e) => { setSelectedAction(e.target.value); setPage(1); }}
              className="w-full text-sm bg-theme-surface dark:bg-slate-900 border border-default rounded-lg px-3 py-2 text-main dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="" className="bg-card dark:bg-slate-900 text-main">Todas las acciones</option>
              <option value="Paso a gestación" className="bg-card dark:bg-slate-900 text-main">Paso a gestación</option>
              <option value="Paso a lactancia" className="bg-card dark:bg-slate-900 text-main">Paso a lactancia</option>
              <option value="Cálculo de crecimiento" className="bg-card dark:bg-slate-900 text-main">Cálculo de crecimiento</option>
              <option value="Turno cerrado con pendientes" className="bg-card dark:bg-slate-900 text-main">Turno con pendientes</option>
            </select>
          </div>

          <AuditDateFilters
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(val) => { setStartDate(val); setPage(1); }}
            onEndDateChange={(val) => { setEndDate(val); setPage(1); }}
          />
        </div>

        <AuditClearFiltersButton hasActiveFilters={hasActiveFilters} onResetFilters={handleResetFilters} />
      </div>

      <AuditLogListCard
        loading={loading}
        logs={logs}
        hasActiveFilters={hasActiveFilters}
        emptyDefaultMessage="Aún no hay movimientos registrados automáticamente por HopTolt en este galpón"
        entityLabels={ENTITY_LABELS}
        actionConfig={ACTION_CONFIG}
        renderActorIcon={(_log, size) => <Sparkles size={size} />}
        getActorName={() => 'HopTolt'}
        getActorUsername={() => 'hoptolt'}
        getFallbackSummary={(entityLabel) => `Realizó una acción automática en ${entityLabel}`}
        hasDetailedDiff={(log) => Boolean(log.details?.before || log.details?.after || log.details?.unfedCount)}
        onSelectLog={setSelectedLogForDetails}
      />

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      <AuditLogDetailDialog
        selectedLog={selectedLogForDetails}
        onClose={() => setSelectedLogForDetails(null)}
        title="Detalle del movimiento de HopTolt"
        entityLabels={ENTITY_LABELS}
        actionConfig={ACTION_CONFIG}
        renderActorIcon={(_log, size) => <Sparkles size={size} />}
        getActorName={() => 'HopTolt'}
        getActorUsername={() => 'hoptolt'}
        getModalFallbackSummary={(entityLabel) => `Movimiento registrado en ${entityLabel}`}
        renderDetailsView={renderDetailsView}
      />
    </div>
  );
}
