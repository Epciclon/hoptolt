'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { farmMemberService } from '../services/farmMember.service';
import type { AuditLogItem, AuditLogFilters, FarmMember } from '../types/farmMember.types';
import { SectionMessage, Button } from '@/shared/ui';
import { Filter, RotateCcw, ChevronLeft, ChevronRight, User, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatFriendlyDate, formatDateTime } from '@/shared/utils/dateUtils';

interface AuditChangeLogTabProps {
  galponId: number;
  workers: FarmMember[];
}

const ENTITY_LABELS: Record<string, string> = {
  cages: 'Jaulas',
  races: 'Razas',
  rabbits: 'Conejos',
  assignments: 'Asignaciones',
  genealogy: 'Genealogía',
  reports: 'Reportes'
};

const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  crear: {
    label: 'Agregó',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
  },
  modificar: {
    label: 'Modificó',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/40'
  },
  eliminar: {
    label: 'Eliminó',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/40'
  },
  consultar: {
    label: 'Consultó',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/40'
  },
  descargar: {
    label: 'Descargó',
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40'
  }
};

const FIELD_LABELS: Record<string, string> = {
  type: 'Tipo de jaula',
  capacity: 'Capacidad',
  status: 'Estado',
  number: 'Número de jaula',
  numbers: 'Números de jaula',
  count: 'Cantidad',
  name: 'Nombre',
  code: 'Código',
  race: 'Raza',
  sex: 'Sexo',
  purpose: 'Propósito',
  weight: 'Peso',
  birthDate: 'Fecha de nacimiento',
  fatherId: 'Padre',
  motherId: 'Madre',
  father: 'Padre',
  mother: 'Madre',
  fatherName: 'Nombre del padre',
  motherName: 'Nombre de la madre',
  fatherCode: 'Código del padre',
  motherCode: 'Código de la madre',
  cageNumber: 'Número de jaula',
  fromCageNumber: 'Jaula de origen',
  targetCageNumber: 'Jaula de destino',
  toCageNumber: 'Jaula de destino',
  rabbits: 'Conejos',
  occupantRabbitCode: 'Conejo ocupante',
  description: 'Descripción',
  moduleName: 'Módulo',
  moduleLabel: 'Nombre del módulo',
  startDate: 'Fecha de inicio',
  endDate: 'Fecha de fin',
  format: 'Formato',
  imageUrl: 'Fotografía',
  rabbit: 'Conejo',
  conejo: 'Conejo',
  coneja: 'Coneja',
  rabbitId: 'Conejo',
  cageId: 'Número de jaula',
  occupantRabbit: 'Conejo ocupante'
};

function getFieldLabel(key: string, val?: any): string {
  if (key === 'rabbits' && Array.isArray(val) && val.length === 1) {
    return 'Conejo';
  }
  return FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

const VALUE_TRANSLATIONS: Record<string, string> = {
  operativa: 'Operativa',
  mantenimiento: 'En mantenimiento',
  inactiva: 'Inactiva',
  engorde: 'Engorde',
  reproducción: 'Reproducción',
  reproduccion: 'Reproducción',
  maternidad: 'Maternidad',
  cuarentena: 'Cuarentena',
  hembra: 'Hembra',
  macho: 'Macho',
  carne: 'Carne',
  'pie de cría': 'Pie de cría',
  mascota: 'Mascota',
  activo: 'Activo',
  inactivo: 'Inactivo',
  pdf: 'PDF',
  excel: 'Excel',
  csv: 'CSV',
  'vista previa': 'Vista previa'
};

function formatValue(key: string, val: any): string {
  if (val === null || val === undefined || val === '') return 'Ninguno';
  if (key === 'imageUrl') {
    if (!val || val === 'null') return 'Sin fotografía';
    return 'Fotografía registrada';
  }
  if (key === 'weight') {
    const num = Number(val);
    if (!Number.isNaN(num)) return `${num} kg`;
    return String(val);
  }
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  if (Array.isArray(val)) {
    if (val.length === 0) return 'Ninguno';
    return val.map((v) => formatValue(key, v)).join(', ');
  }
  if (typeof val === 'number') {
    if (key === 'capacity') return `${val} ${val === 1 ? 'conejo' : 'conejos'}`;
    if (key === 'rabbitId') return `Conejo #${val}`;
    if (key === 'cageId') return `Jaula #${val}`;
    return String(val);
  }
  const strVal = String(val).trim();
  const lower = strVal.toLowerCase();
  if (VALUE_TRANSLATIONS[lower]) return VALUE_TRANSLATIONS[lower];

  if (key.toLowerCase().includes('date') && strVal.includes('-')) {
    const d = new Date(strVal);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }

  return strVal.charAt(0).toUpperCase() + strVal.slice(1);
}

interface DiffItem {
  key: string;
  label: string;
  beforeVal: string;
  afterVal: string;
  beforeRaw?: any;
  afterRaw?: any;
  isChanged: boolean;
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
    const bStr = formatValue(k, bVal);
    const aStr = formatValue(k, aVal);
    const label = getFieldLabel(k, aVal !== undefined ? aVal : bVal);

    let isChanged = false;
    if (k === 'weight') {
      const bNum = bVal !== null && bVal !== undefined && bVal !== '' ? Number(bVal) : null;
      const aNum = aVal !== null && aVal !== undefined && aVal !== '' ? Number(aVal) : null;
      if (bNum === null && aNum === null) {
        isChanged = false;
      } else if (bNum === null || aNum === null || Number.isNaN(bNum) || Number.isNaN(aNum)) {
        isChanged = bVal !== aVal;
      } else {
        isChanged = Math.abs(bNum - aNum) > 0.0001;
      }
    } else {
      isChanged = JSON.stringify(bVal) !== JSON.stringify(aVal);
    }

    if (isChanged) {
      changed.push({ key: k, label, beforeVal: bStr, afterVal: aStr, beforeRaw: bVal, afterRaw: aVal, isChanged: true });
    }
  }

  return changed;
}

function renderDetailsView(log: AuditLogItem) {
  const { action, details } = log;
  const before = details?.before;
  const after = details?.after;

  if (action === 'modificar' && before && after) {
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
                {item.key === 'imageUrl' ? (
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!item.beforeRaw && item.afterRaw && (
                        <span className="font-semibold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-900/30">
                          Se agregó fotografía
                        </span>
                      )}
                      {item.beforeRaw && !item.afterRaw && (
                        <span className="font-semibold text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900/30">
                          Se eliminó la fotografía
                        </span>
                      )}
                      {item.beforeRaw && item.afterRaw && (
                        <span className="font-semibold text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded-md border border-sky-200 dark:border-sky-900/30">
                          Se cambió la fotografía
                        </span>
                      )}
                    </div>
                    {item.afterRaw && (
                      <div className="flex items-center gap-2 mt-1">
                        <img 
                          src={item.afterRaw} 
                          alt="Fotografía" 
                          className="w-12 h-12 rounded-lg object-cover border border-default shadow-xs"
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="line-through text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900/30">
                      {item.beforeVal}
                    </span>
                    <span className="text-muted font-bold text-sm">➔</span>
                    <span className="font-semibold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-900/30">
                      {item.afterVal}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted">No se detectaron diferencias en los atributos principales</p>
        )}
      </div>
    );
  }

  if (['crear', 'consultar', 'descargar'].includes(action) && after && typeof after === 'object') {
    let title = 'Datos registrados';
    if (action === 'consultar') title = 'Detalles de la consulta';
    if (action === 'descargar') title = 'Detalles de la descarga';

    const keys = Object.keys(after).filter(k => {
      if (['id', 'galponId'].includes(k)) return false;
      if (k === 'module' && after.moduleLabel) return false;
      return true;
    });

    return (
      <div className="space-y-2.5">
        <span className="text-xs font-semibold text-main uppercase tracking-wider block">
          {title}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {keys.map((k) => (
            <div key={k} className="bg-theme-surface border border-default rounded-xl p-3 text-xs shadow-2xs">
              <span className="font-semibold text-muted block mb-1">{getFieldLabel(k, after[k])}</span>
              {k === 'imageUrl' && after[k] ? (
                <div className="flex items-center gap-2 mt-1">
                  <img 
                    src={after[k]} 
                    alt="Fotografía" 
                    className="w-12 h-12 rounded-lg object-cover border border-default shadow-xs"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                </div>
              ) : (
                <span className="font-medium text-main text-xs">{formatValue(k, after[k])}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (action === 'eliminar' && before && typeof before === 'object') {
    const keys = Object.keys(before).filter(k => !['id', 'galponId'].includes(k));
    return (
      <div className="space-y-2.5">
        <span className="text-xs font-semibold text-main uppercase tracking-wider block">
          Datos del elemento eliminado
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {keys.map((k) => (
            <div key={k} className="bg-theme-surface border border-default rounded-xl p-3 text-xs shadow-2xs">
              <span className="font-semibold text-muted block mb-1">{getFieldLabel(k, before[k])}</span>
              {k === 'imageUrl' ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-semibold text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900/30">
                    Se eliminó la fotografía
                  </span>
                </div>
              ) : (
                <span className="font-medium text-rose-600 dark:text-rose-400 text-xs">{formatValue(k, before[k])}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {before && (
        <div>
          <span className="text-xs font-semibold text-muted block mb-1">Estado anterior</span>
          <span className="text-xs text-main">{String(before)}</span>
        </div>
      )}
      {after && (
        <div>
          <span className="text-xs font-semibold text-muted block mb-1">Nuevo estado</span>
          <span className="text-xs text-main">{String(after)}</span>
        </div>
      )}
    </div>
  );
}

export function AuditChangeLogTab({ galponId, workers }: Readonly<AuditChangeLogTabProps>) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Filtros
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data, isLoading: loading } = useQuery({
    queryKey: ['auditLogs', galponId, page, selectedWorkerId, selectedEntity, selectedAction, startDate, endDate],
    queryFn: () => {
      const filters: AuditLogFilters = { page, limit: 15 };
      if (selectedWorkerId) filters.profileId = selectedWorkerId;
      if (selectedEntity) filters.entity = selectedEntity;
      if (selectedAction) filters.action = selectedAction;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      return farmMemberService.getAuditLogs(galponId, filters);
    },
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true
  });

  const logs = data?.logs || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;

  // Suscripción Realtime para invalidar la caché inmediatamente ante nuevos registros
  useEffect(() => {
    const supabase = createClient();
    const channelId = `realtime_audit_logs_${galponId}_${crypto.randomUUID()}`;
    const channel = supabase.channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [galponId, queryClient]);

  const handleResetFilters = () => {
    setSelectedWorkerId('');
    setSelectedEntity('');
    setSelectedAction('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(selectedWorkerId || selectedEntity || selectedAction || startDate || endDate);

  return (
    <div className="space-y-4">
      <SectionMessage message="Registro de cambios realizados por tus trabajadores en los procesos sensibles del galpón." />

      {/* Barra de Filtros */}
      <div className="bg-card rounded-xl p-4 border border-strong shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-main mb-1">
          <Filter size={16} className="text-primary-500" />
          <span>Filtros de búsqueda</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Filtro por Trabajador */}
          <div>
            <label htmlFor="filter-worker-select" className="block text-xs font-medium text-muted mb-1">Trabajador</label>
            <select
              id="filter-worker-select"
              value={selectedWorkerId}
              onChange={(e) => { setSelectedWorkerId(e.target.value); setPage(1); }}
              className="w-full text-sm bg-theme-surface dark:bg-slate-900 border border-default rounded-lg px-3 py-2 text-main dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="" className="bg-card dark:bg-slate-900 text-main">Todos los trabajadores</option>
              {workers.map((w) => (
                <option key={w.id} value={w.profile?.id} className="bg-card dark:bg-slate-900 text-main">
                  {w.profile?.fullName || w.profile?.username}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Proceso */}
          <div>
            <label htmlFor="filter-process-select" className="block text-xs font-medium text-muted mb-1">Proceso</label>
            <select
              id="filter-process-select"
              value={selectedEntity}
              onChange={(e) => { setSelectedEntity(e.target.value); setPage(1); }}
              className="w-full text-sm bg-theme-surface dark:bg-slate-900 border border-default rounded-lg px-3 py-2 text-main dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="" className="bg-card dark:bg-slate-900 text-main">Todos los procesos</option>
              <option value="cages" className="bg-card dark:bg-slate-900 text-main">Jaulas</option>
              <option value="races" className="bg-card dark:bg-slate-900 text-main">Razas</option>
              <option value="rabbits" className="bg-card dark:bg-slate-900 text-main">Conejos</option>
              <option value="assignments" className="bg-card dark:bg-slate-900 text-main">Asignaciones</option>
              <option value="genealogy" className="bg-card dark:bg-slate-900 text-main">Genealogía</option>
              <option value="reports" className="bg-card dark:bg-slate-900 text-main">Reportes</option>
            </select>
          </div>

          {/* Filtro por Acción */}
          <div>
            <label htmlFor="filter-action-select" className="block text-xs font-medium text-muted mb-1">Acción</label>
            <select
              id="filter-action-select"
              value={selectedAction}
              onChange={(e) => { setSelectedAction(e.target.value); setPage(1); }}
              className="w-full text-sm bg-theme-surface dark:bg-slate-900 border border-default rounded-lg px-3 py-2 text-main dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="" className="bg-card dark:bg-slate-900 text-main">Todas las acciones</option>
              <option value="crear" className="bg-card dark:bg-slate-900 text-main">Agregó</option>
              <option value="modificar" className="bg-card dark:bg-slate-900 text-main">Modificó</option>
              <option value="eliminar" className="bg-card dark:bg-slate-900 text-main">Eliminó</option>
              <option value="consultar" className="bg-card dark:bg-slate-900 text-main">Consultó</option>
            </select>
          </div>

          {/* Fecha Desde */}
          <div>
            <label htmlFor="filter-start-date" className="block text-xs font-medium text-muted mb-1">Desde</label>
            <input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full text-sm bg-theme-surface border border-default rounded-lg px-3 py-2 text-main focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label htmlFor="filter-end-date" className="block text-xs font-medium text-muted mb-1">Hasta</label>
            <input
              id="filter-end-date"
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
                      : 'Aún no hay cambios registrados por trabajadores en este galpón'}
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
                const hasDetailedDiff = Boolean(log.details?.before || log.details?.after);

                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-theme-surface/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Avatar y Usuario */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-sm shrink-0 border border-primary-200 dark:border-primary-800/40">
                          {log.profile?.fullName ? log.profile.fullName.charAt(0).toUpperCase() : <User size={18} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-main text-sm">
                              {log.profile?.fullName || 'Trabajador'}
                            </span>
                            <span className="text-xs text-muted">
                              @{log.profile?.username || 'usuario'}
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
                            {log.details?.summary || `Realizó una acción en ${entityLabel}`}
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
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer mt-1"
                          >
                            {isExpanded ? 'Ocultar detalles' : 'Ver detalle'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Detalle expandible con comparación visual clara sin JSON */}
                    {isExpanded && hasDetailedDiff && (
                      <div className="mt-3.5 pt-3 border-t border-default bg-theme-surface/70 p-3.5 rounded-xl">
                        {renderDetailsView(log)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2 text-sm text-muted">
          <span>
            Total: {totalCount} registros
          </span>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft size={16} />
              <span>Anterior</span>
            </Button>

            <span className="text-xs font-medium px-2">
              Página {page} de {totalPages}
            </span>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              <span>Siguiente</span>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
