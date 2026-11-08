'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import { Mail, AtSign, Box, ArrowLeft } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import type { FarmMember } from '@/modules/farmMember/types/farmMember.types';

interface AuditHistoryViewProps {
  readonly renderTable: (profileId: string, date: string) => React.ReactNode;
  readonly fetchActiveDates?: (profileId: string) => Promise<string[]>;
  readonly moduleName: string;
}

// Obtener fecha en zona horaria de Ecuador (YYYY-MM-DD)
const getEcuadorDateString = (dateObj: Date = new Date()) => {
  const ecuadorDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const year = ecuadorDate.getFullYear();
  const month = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
  const day = String(ecuadorDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface AuditWorkerCardProps {
  member: any;
  isExpanded: boolean;
  onSelect: (member: any) => void;
  onToggleExpand: (memberId: string | number) => void;
}

function getWorkerRoleBadgeClass(isOwner: boolean, status: string): string {
  if (isOwner) {
    return 'bg-theme-surface border border-default text-main';
  }
  if (status === 'inactive') {
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700';
  }
  return 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400';
}

function getWorkerRoleLabel(isOwner: boolean, status: string): string {
  if (isOwner) return 'Propietario';
  if (status === 'inactive') return 'Ex-trabajador';
  return 'Trabajador';
}

function getSelectedWorkerSubtitle(isOwner: boolean, isInactive: boolean): string {
  if (isOwner) return 'Propietario del Galpón';
  if (isInactive) return 'Ex-trabajador desvinculado - registros históricos conservados';
  return 'Trabajador del Galpón';
}

function AuditWorkerCard({ member, isExpanded, onSelect, onToggleExpand }: Readonly<AuditWorkerCardProps>) {
  const profile = member.profile;
  if (!profile) return null;

  const isOwner = member.role === 'owner';
  const initials = (profile.fullName || profile.username || 'U')
    .split(' ')
    .map((s: string) => s.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const assignedCages = member.assignedCages || [];
  const visibleCages = isExpanded ? assignedCages : assignedCages.slice(0, 8);

  return (
    <div className="flex flex-col text-left bg-card border border-strong rounded-xl p-4 hover:border-primary-300 hover:shadow-md transition-all group">
      <button
        type="button"
        onClick={() => onSelect(member)}
        className="w-full text-left focus:outline-none"
      >
        <div className="flex items-center gap-3 w-full border-b border-default pb-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-main truncate">
              {profile.fullName || profile.username}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5">
              <span className={`px-1.5 py-0.5 rounded font-medium ${getWorkerRoleBadgeClass(isOwner, member.status)}`}>
                {getWorkerRoleLabel(isOwner, member.status)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 w-full">
          {profile.email && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Mail size={14} className="text-theme-faint" />
              <span className="truncate">{profile.email}</span>
            </div>
          )}
          {profile.username && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <AtSign size={14} className="text-theme-faint" />
              <span className="truncate">{profile.username}</span>
            </div>
          )}
        </div>
      </button>

      {/* Jaulas Asignadas [Solo para trabajadores] */}
      {!isOwner && (
        <div className="mt-2 pt-2 border-t border-default w-full">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase mb-1.5">
            <Box size={13} />
            {member.status === 'inactive' ? 'Estado' : `Jaulas Asignadas: ${assignedCages.length}`}
          </div>
          {member.status === 'inactive' && (
            <span className="text-xs text-amber-600 dark:text-amber-400 italic">Desvinculado del galpón</span>
          )}
          {member.status !== 'inactive' && assignedCages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {visibleCages.map((wc: any) => (
                <span key={wc.id} className="text-xs font-semibold bg-theme-surface border border-default text-main px-2 py-0.5 rounded-md min-w-[1.75rem] text-center" title={`Jaula ${wc.cage?.number ?? wc.cageId}`}>
                  {wc.cage?.number ?? wc.cageId}
                </span>
              ))}
              {assignedCages.length > 8 && (
                <button
                  type="button"
                  onClick={() => onToggleExpand(member.id)}
                  className="cursor-pointer text-xs font-semibold bg-theme-surface border border-default hover:border-primary-500 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-md transition-colors"
                  title={isExpanded ? 'Ver menos' : 'Ver todas'}
                >
                  {isExpanded ? 'Menos' : `+${assignedCages.length - 8}`}
                </button>
              )}
            </div>
          )}
          {member.status !== 'inactive' && assignedCages.length === 0 && (
            <span className="text-xs text-theme-faint italic">Ninguna</span>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditHistoryView({ renderTable, fetchActiveDates, moduleName }: Readonly<AuditHistoryViewProps>) {
  const { activeGalpon } = useActiveGalpon();
  const [selectedWorker, setSelectedWorker] = useState<FarmMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getEcuadorDateString());
  const [expandedWorkers, setExpandedWorkers] = useState<Record<string, boolean>>({});

  // Resetea la vista si cambian de galpón
  useEffect(() => {
    setSelectedWorker(null);
  }, [activeGalpon?.id]);

  const { data: activeDates, isLoading: loadingDates } = useQuery({
    queryKey: ['active-dates', moduleName, selectedWorker?.profile?.id],
    queryFn: async () => {
      if (!selectedWorker?.profile?.id || !renderTable.name /* to satisfy linter */) return [];
      if (fetchActiveDates) {
        return fetchActiveDates(selectedWorker.profile.id);
      }
      return [];
    },
    enabled: !!selectedWorker?.profile?.id && !!fetchActiveDates,
  });

  useEffect(() => {
    if (fetchActiveDates && activeDates && activeDates.length > 0) {
      setSelectedDate(activeDates[0]);
    } else if (fetchActiveDates && activeDates?.length === 0) {
      setSelectedDate(getEcuadorDateString());
    }
  }, [activeDates, fetchActiveDates]);

  type DateTree = Record<string, Record<string, string[]>>;
  const dateTree = useMemo(() => {
    if (!activeDates) return {} as DateTree;
    const tree: DateTree = {};
    activeDates.forEach(date => {
      const [y, m, d] = date.split('-');
      if (!tree[y]) tree[y] = {};
      if (!tree[y][m]) tree[y][m] = [];
      if (!tree[y][m].includes(d)) tree[y][m].push(d);
    });
    return tree;
  }, [activeDates]);

  const [currentYear, currentMonth, currentDay] = selectedDate.split('-');
  
  const availableYears = useMemo(() => Object.keys(dateTree).sort((a, b) => b.localeCompare(a)), [dateTree]);
  const availableMonths = useMemo(() => dateTree[currentYear] ? Object.keys(dateTree[currentYear]).sort((a, b) => b.localeCompare(a)) : [], [dateTree, currentYear]);
  const availableDays = useMemo(() => dateTree[currentYear]?.[currentMonth]?.sort((a, b) => b.localeCompare(a)) || [], [dateTree, currentYear, currentMonth]);

  const onYearChange = (newYear: string) => {
    const newMonths = Object.keys(dateTree[newYear]).sort((a, b) => b.localeCompare(a));
    const newMonth = newMonths[0];
    const newDays = dateTree[newYear][newMonth].sort((a, b) => b.localeCompare(a));
    const newDay = newDays[0];
    setSelectedDate(`${newYear}-${newMonth}-${newDay}`);
  };

  const onMonthChange = (newMonth: string) => {
    const newDays = dateTree[currentYear][newMonth].sort((a, b) => b.localeCompare(a));
    const newDay = newDays[0];
    setSelectedDate(`${currentYear}-${newMonth}-${newDay}`);
  };

  const onDayChange = (newDay: string) => {
    setSelectedDate(`${currentYear}-${currentMonth}-${newDay}`);
  };

  const monthNames: Record<string, string> = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  };

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['farm-members-all', activeGalpon?.id],
    queryFn: () => farmMemberService.getAllMembersByGalpon(activeGalpon!.id),
    enabled: !!activeGalpon,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Vista Detallada (In-page view)
  if (selectedWorker?.profile) {
    const isOwner = selectedWorker.role === 'owner';
    const isInactive = selectedWorker.status === 'inactive';
    const profileName = selectedWorker.profile.fullName || selectedWorker.profile.username || 'Usuario';
    const maxDate = getEcuadorDateString();

    return (
      <div className="space-y-4">
        {/* Header del Detalle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl shadow-sm border border-strong">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <Button 
              variant="outline" 
              size="sm"
              icon={<ArrowLeft size={16} />} 
              onClick={() => setSelectedWorker(null)}
              className="self-start sm:self-auto shrink-0"
            >
              Volver
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-main">Historial de {profileName}</h2>
                {isInactive && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 font-semibold">
                    Inactivo - Ex-trabajador
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 mt-1">
                <p className="text-sm font-medium text-muted">
                  {getSelectedWorkerSubtitle(isOwner, isInactive)}
                </p>
                <p className="text-xs text-muted">
                  Selecciona un registro de la lista para ver información más detallada.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium text-muted">Filtrar por fecha:</span>
            {(() => {
              if (!fetchActiveDates) {
                return (
                  <Input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={maxDate}
                    className="w-full sm:w-40"
                  />
                );
              }
              if (loadingDates) {
                return <div className="text-sm text-muted py-1.5 px-3">Cargando fechas...</div>;
              }
              if (activeDates && activeDates.length > 0) {
                return (
                  <div className="grid grid-cols-[0.8fr_1.6fr_1.3fr] gap-2 w-full sm:flex sm:items-center sm:w-auto">
                    <select
                      value={currentDay}
                      onChange={(e) => onDayChange(e.target.value)}
                      className="border border-default bg-theme-surface dark:bg-slate-900 text-main rounded-md shadow-sm py-1.5 px-1.5 sm:px-2 text-xs sm:text-sm focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto sm:min-w-[64px]"
                      title="Día"
                    >
                      {availableDays.map(d => <option key={d} value={d} className="bg-card dark:bg-slate-900 text-main">{d}</option>)}
                    </select>
                    <select
                      value={currentMonth}
                      onChange={(e) => onMonthChange(e.target.value)}
                      className="border border-default bg-theme-surface dark:bg-slate-900 text-main rounded-md shadow-sm py-1.5 px-1.5 sm:px-2 text-xs sm:text-sm focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto sm:min-w-[120px]"
                      title="Mes"
                    >
                      {availableMonths.map(m => <option key={m} value={m} className="bg-card dark:bg-slate-900 text-main">{monthNames[m]}</option>)}
                    </select>
                    <select
                      value={currentYear}
                      onChange={(e) => onYearChange(e.target.value)}
                      className="border border-default bg-theme-surface dark:bg-slate-900 text-main rounded-md shadow-sm py-1.5 px-1.5 sm:px-2 text-xs sm:text-sm focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto sm:min-w-[85px]"
                      title="Año"
                    >
                      {availableYears.map(y => <option key={y} value={y} className="bg-card dark:bg-slate-900 text-main">{y}</option>)}
                    </select>
                  </div>
                );
              }
              return <div className="text-sm text-muted py-1.5 px-3">No hay registros en este galpón</div>;
            })()}
          </div>
        </div>

        {/* Tabla inyectada por el módulo */}
        <div className="bg-card rounded-xl shadow-sm border border-strong p-2 sm:p-4 overflow-hidden">
          <div className="w-full overflow-x-auto">
            {renderTable(selectedWorker.profile.id, selectedDate)}
          </div>
        </div>
      </div>
    );
  }

  // Vista Principal (Grid de Tarjetas)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <AuditWorkerCard
            key={member.id}
            member={member}
            isExpanded={Boolean(expandedWorkers[member.id])}
            onSelect={(m) => {
              setSelectedWorker(m);
              setSelectedDate(getEcuadorDateString());
            }}
            onToggleExpand={(id) => {
              setExpandedWorkers(prev => ({
                ...prev,
                [id]: !prev[id]
              }));
            }}
          />
        ))}
      </div>
    </div>
  );
}
