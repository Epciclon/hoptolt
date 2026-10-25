'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { farmMemberService } from '../services/farmMember.service';
import type { AuditLogItem, AuditLogFilters } from '../types/farmMember.types';
import { SectionMessage, Button } from '@/shared/ui';
import { Filter, RotateCcw, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatFriendlyDate, formatDateTime } from '@/shared/utils/dateUtils';

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
  status: 'Estado',
  unfedCount: 'Jaulas sin alimentar',
  itemName: 'Elemento afectado',
  rabbitCode: 'Código de conejo',
  rabbitName: 'Nombre de conejo'
};

function formatValue(key: string, val: any): string {
  if (val === null || val === undefined || val === '') return 'Ninguno';
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
  if (typeof val === 'number') return String(val);
  return String(val).trim();
}

interface DiffItem {
  key: string;
  label: string;
  beforeVal: string;
  afterVal: string;
}

function computeDiff(before: any, after: any): DiffItem[] {
  const b = before && typeof before === 'object' ? before : {};
  const a = after && typeof after === 'object' ? after : {};
  const allKeys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));

  const changed: DiffItem[] = [];

  for (const k of allKeys) {
    if (['id', 'galponId', 'createdAt', 'updatedAt', 'profileId'].includes(k)) continue;

    const bVal = b[k];
    const aVal = a[k];
    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      changed.push({
        key: k,
        label: FIELD_LABELS[k] || k,
        beforeVal: formatValue(k, bVal),
        afterVal: formatValue(k, aVal)
      });
    }
  }

  return changed;
}

function renderDetailsView(log: AuditLogItem) {
  const { action, details } = log;
  const before = details?.before;
  const after = details?.after;

  if (before && after) {
    const changed = computeDiff(before, after);

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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="line-through text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900/30">
                    {item.beforeVal}
                  </span>
                  <span className="text-muted font-bold text-sm">➔</span>
                  <span className="font-semibold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-900/30">
                    {item.afterVal}
                  </span>
                </div>
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
      !['id', 'galponId', 'isSystem', 'systemActor', 'summary', 'before', 'after'].includes(k)
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
                <span className="font-semibold text-muted block mb-1">{FIELD_LABELS[k] || k}</span>
                <span className="font-medium text-main text-xs">{formatValue(k, details[k])}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="text-xs text-muted">
      <span>Proceso completado sin detalles adicionales</span>
    </div>
  );
}

export function SystemAuditLogTab({ galponId }: SystemAuditLogTabProps) {
  const queryClient = useQueryClient();

  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const filters: AuditLogFilters = {
    entity: selectedEntity || undefined,
    action: selectedAction || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    isSystem: true,
    page,
    limit: 20
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['systemAuditLogs', galponId, filters],
    queryFn: () => farmMemberService.getAuditLogs(galponId, filters),
    enabled: Boolean(galponId),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const loading = isLoading || isFetching;

  // Suscripción Realtime para invalidar la caché inmediatamente ante nuevos registros
  useEffect(() => {
    const supabase = createClient();
    const channelId = `realtime_system_audit_${galponId}_${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['systemAuditLogs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [galponId, queryClient]);

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
      <SectionMessage message="Registro de movimientos y procesos ejecutados automáticamente por HopTolt en este galpón." />

      {/* Barra de Filtros */}
      <div className="bg-card rounded-xl p-4 border border-strong shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-main mb-1">
          <Filter size={16} className="text-primary-500" />
          <span>Filtros de búsqueda</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filtro por Proceso */}
          <div>
            <label htmlFor="filter-system-process" className="block text-xs font-medium text-muted mb-1">Proceso</label>
            <select
              id="filter-system-process"
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

          {/* Filtro por Acción */}
          <div>
            <label htmlFor="filter-system-action" className="block text-xs font-medium text-muted mb-1">Acción</label>
            <select
              id="filter-system-action"
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

          {/* Fecha Desde */}
          <div>
            <label htmlFor="filter-system-start-date" className="block text-xs font-medium text-muted mb-1">Desde</label>
            <input
              id="filter-system-start-date"
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full text-sm bg-theme-surface border border-default rounded-lg px-3 py-2 text-main focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label htmlFor="filter-system-end-date" className="block text-xs font-medium text-muted mb-1">Hasta</label>
            <input
              id="filter-system-end-date"
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full text-sm bg-theme-surface border border-default rounded-lg px-3 py-2 text-main focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Limpiar filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* Lista de Registros */}
      <div className="bg-card rounded-xl shadow-sm border border-strong overflow-hidden">
        {(() => {
          if (loading) {
            return (
              <div className="p-12 text-center text-muted flex flex-col items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                <span className="text-sm">Cargando registros...</span>
              </div>
            );
          }

          if (logs.length === 0) {
            return (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-theme-surface flex items-center justify-center text-muted">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-main">Sin registros para mostrar</h4>
                  <p className="text-sm text-muted mt-1">
                    {hasActiveFilters
                      ? 'No hay registros que coincidan con los filtros aplicados'
                      : 'Aún no hay movimientos registrados automáticamente por HopTolt en este galpón'}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div className="divide-y divide-default">
              {logs.map((log) => {
                const actionConf = ACTION_CONFIG[log.action] || {
                  label: log.action,
                  className: 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200 border-gray-200 dark:border-slate-700'
                };
                const entityLabel = ENTITY_LABELS[log.entity] || log.entity;
                const isExpanded = expandedLogId === log.id;
                const hasDetailedDiff = Boolean(log.details?.before || log.details?.after || log.details?.unfedCount);

                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-theme-surface/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Avatar y Usuario */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-sm shrink-0 border border-primary-200 dark:border-primary-800/40">
                          <Sparkles size={18} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-main text-sm">
                              HopTolt
                            </span>
                            <span className="text-xs text-muted">
                              @hoptolt
                            </span>

                            {/* Badge Proceso */}
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-theme-surface border border-default text-main">
                              {entityLabel}
                            </span>

                            {/* Badge Acción */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${actionConf.className}`}>
                              {actionConf.label}
                            </span>
                          </div>

                          {/* Resumen del cambio */}
                          <p className="text-sm text-main mt-1.5 leading-relaxed">
                            {log.details?.summary || `Realizó una acción automática en ${entityLabel}`}
                          </p>
                        </div>
                      </div>

                      {/* Fecha y botón de detalles */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs text-theme-faint" title={formatDateTime(log.createdAt)}>
                          {formatFriendlyDate(log.createdAt)}
                        </span>

                        {hasDetailedDiff && (
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer mt-1"
                          >
                            <span>{isExpanded ? 'Ocultar detalle' : 'Ver detalle'}</span>
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Panel desplegable con comparativa visual */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-default pl-0 sm:pl-13">
                        {renderDetailsView(log)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-default flex items-center justify-between bg-card text-xs">
            <span className="text-muted">
              Total {total} registros
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={14} />
                <span>Anterior</span>
              </Button>

              <span className="text-muted font-medium px-2">
                Página {page} de {totalPages}
              </span>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <span>Siguiente</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
