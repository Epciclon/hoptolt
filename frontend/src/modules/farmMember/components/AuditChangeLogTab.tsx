'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { farmMemberService } from '../services/farmMember.service';
import type { AuditLogItem, AuditLogFilters, FarmMember } from '../types/farmMember.types';
import { SectionMessage } from '@/shared/ui';
import { Pagination } from '@/shared/ui/Pagination';
import { Filter, User } from 'lucide-react';
import {
  type AuditDiffItem,
  AUDIT_IGNORED_DIFF_KEYS,
  useAuditLogsRealtime,
  AuditDateFilters,
  AuditClearFiltersButton,
  AuditFallbackBeforeAfter,
  AuditStandardDiffValue,
  AuditLogListCard,
  AuditLogDetailDialog,
} from './AuditLogShared';

interface AuditChangeLogTabProps {
  galponId: number;
  workers: FarmMember[];
}

const ENTITY_LABELS: Record<string, string> = {
  cages: 'Jaulas',
  races: 'Razas',
  rabbits: 'Conejos',
  assignments: 'Asignaciones',
  reproduction: 'Reproducción',
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
  macho: 'Macho',
  mountDate: 'Fecha de monta',
  estimatedBirthDate: 'Fecha de parto',
  bornKits: 'Gazapos vivos',
  cancellationReason: 'Motivo de cancelación',
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
  monta: 'Fase 1: Monta',
  gestacion: 'Fase 2: Gestación',
  lactancia: 'Fase 3: Lactancia',
  completado: 'Completado',
  fallido: 'Fallido',
  pdf: 'PDF',
  excel: 'Excel',
  csv: 'CSV',
  'vista previa': 'Vista previa'
};

function formatNumberValue(key: string, val: number): string {
  if (key === 'capacity') return `${val} ${val === 1 ? 'conejo' : 'conejos'}`;
  if (key === 'rabbitId') return `Conejo #${val}`;
  if (key === 'cageId') return `Jaula #${val}`;
  return String(val);
}

function formatStringValue(key: string, val: any): string {
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

function formatValue(key: string, val: any): string {
  if (val === null || val === undefined || val === '') return 'Ninguno';
  if (key === 'imageUrl') {
    return (!val || val === 'null') ? 'Sin fotografía' : 'Fotografía registrada';
  }
  if (key === 'weight') {
    const num = Number(val);
    return !Number.isNaN(num) ? `${num} kg` : String(val);
  }
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  if (Array.isArray(val)) {
    return val.length === 0 ? 'Ninguno' : val.map((v) => formatValue(key, v)).join(', ');
  }
  if (typeof val === 'number') return formatNumberValue(key, val);
  return formatStringValue(key, val);
}

function isWeightDiffChanged(bVal: any, aVal: any): boolean {
  const bNum = bVal !== null && bVal !== undefined && bVal !== '' ? Number(bVal) : null;
  const aNum = aVal !== null && aVal !== undefined && aVal !== '' ? Number(aVal) : null;
  if (bNum === null && aNum === null) {
    return false;
  }
  if (bNum === null || aNum === null || Number.isNaN(bNum) || Number.isNaN(aNum)) {
    return bVal !== aVal;
  }
  return Math.abs(bNum - aNum) > 0.0001;
}

function computeDiff(before: any, after: any): AuditDiffItem[] {
  const b = before && typeof before === 'object' ? before : {};
  const a = after && typeof after === 'object' ? after : {};
  const allKeys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));

  const changed: AuditDiffItem[] = [];

  for (const k of allKeys) {
    if (AUDIT_IGNORED_DIFF_KEYS.has(k)) continue;

    const bVal = b[k];
    const aVal = a[k];
    const bStr = formatValue(k, bVal);
    const aStr = formatValue(k, aVal);
    const label = getFieldLabel(k, aVal !== undefined ? aVal : bVal);

    const isChanged = k === 'weight'
      ? isWeightDiffChanged(bVal, aVal)
      : JSON.stringify(bVal) !== JSON.stringify(aVal);

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
                  <AuditStandardDiffValue beforeVal={item.beforeVal} afterVal={item.afterVal} />
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

  return <AuditFallbackBeforeAfter before={before} after={after} />;
}

export function AuditChangeLogTab({ galponId, workers }: Readonly<AuditChangeLogTabProps>) {
  const [page, setPage] = useState(1);
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<AuditLogItem | null>(null);

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data, isLoading } = useQuery({
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
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: false
  });

  const logs = data?.logs || [];
  const totalPages = data?.totalPages || 1;
  const loading = isLoading && !data;

  useAuditLogsRealtime(galponId, 'realtime_audit_logs', 'auditLogs');

  const handleResetFilters = () => {
    setSelectedWorkerId('');
    setSelectedEntity('');
    setSelectedAction('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(selectedWorkerId || selectedEntity || selectedAction || startDate || endDate);

  const renderWorkerActorIcon = (log: AuditLogItem, size: number) =>
    log.profile?.fullName ? log.profile.fullName.charAt(0).toUpperCase() : <User size={size} />;

  return (
    <div className="space-y-4">
      <SectionMessage message="Registro de cambios realizados por tus trabajadores en los procesos sensibles del galpón." />

      <div className="bg-card rounded-xl p-4 border border-strong shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-main mb-1">
          <Filter size={16} className="text-primary-500" />
          <span>Filtros de búsqueda</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
              <option value="reproduction" className="bg-card dark:bg-slate-900 text-main">Reproducción</option>
              <option value="genealogy" className="bg-card dark:bg-slate-900 text-main">Genealogía</option>
              <option value="reports" className="bg-card dark:bg-slate-900 text-main">Reportes</option>
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
              <option value="crear" className="bg-card dark:bg-slate-900 text-main">Agregó</option>
              <option value="modificar" className="bg-card dark:bg-slate-900 text-main">Modificó</option>
              <option value="eliminar" className="bg-card dark:bg-slate-900 text-main">Eliminó</option>
              <option value="consultar" className="bg-card dark:bg-slate-900 text-main">Consultó</option>
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
        emptyDefaultMessage="Aún no hay cambios registrados por trabajadores en este galpón"
        entityLabels={ENTITY_LABELS}
        actionConfig={ACTION_CONFIG}
        renderActorIcon={renderWorkerActorIcon}
        getActorName={(log) => log.profile?.fullName || 'Trabajador'}
        getActorUsername={(log) => log.profile?.username || 'usuario'}
        getFallbackSummary={(entityLabel) => `Realizó una acción en ${entityLabel}`}
        hasDetailedDiff={(log) => Boolean(log.details?.before || log.details?.after)}
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
        title="Detalle del registro de cambio"
        entityLabels={ENTITY_LABELS}
        actionConfig={ACTION_CONFIG}
        renderActorIcon={renderWorkerActorIcon}
        getActorName={(log) => log.profile?.fullName || 'Trabajador'}
        getActorUsername={(log) => log.profile?.username || 'usuario'}
        getModalFallbackSummary={(entityLabel) => `Acción realizada en ${entityLabel}`}
        renderDetailsView={renderDetailsView}
      />
    </div>
  );
}
