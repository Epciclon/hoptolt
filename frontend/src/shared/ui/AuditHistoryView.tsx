'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { farmMemberService } from '@/modules/farmMember/services/farmMember.service';
import { useActiveGalpon } from '@/modules/galpones/hooks/useActiveGalpon';
import { Mail, AtSign, Box, ArrowLeft, Calendar } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import type { FarmMember } from '@/modules/farmMember/types/farmMember.types';

interface AuditHistoryViewProps {
  renderTable: (profileId: string, date: string) => React.ReactNode;
  fetchActiveDates?: (profileId: string) => Promise<string[]>;
  moduleName: string;
}

// Obtener fecha en zona horaria de Ecuador (YYYY-MM-DD)
const getEcuadorDateString = (dateObj: Date = new Date()) => {
  const ecuadorDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const year = ecuadorDate.getFullYear();
  const month = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
  const day = String(ecuadorDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function AuditHistoryView({ renderTable, fetchActiveDates, moduleName }: AuditHistoryViewProps) {
  const { activeGalpon } = useActiveGalpon();
  const [selectedWorker, setSelectedWorker] = useState<FarmMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getEcuadorDateString());

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
  
  const availableYears = useMemo(() => Object.keys(dateTree).sort().reverse(), [dateTree]);
  const availableMonths = useMemo(() => dateTree[currentYear] ? Object.keys(dateTree[currentYear]).sort().reverse() : [], [dateTree, currentYear]);
  const availableDays = useMemo(() => (dateTree[currentYear] && dateTree[currentYear][currentMonth]) ? dateTree[currentYear][currentMonth].sort().reverse() : [], [dateTree, currentYear, currentMonth]);

  const onYearChange = (newYear: string) => {
    const newMonths = Object.keys(dateTree[newYear]).sort().reverse();
    const newMonth = newMonths[0];
    const newDays = dateTree[newYear][newMonth].sort().reverse();
    const newDay = newDays[0];
    setSelectedDate(`${newYear}-${newMonth}-${newDay}`);
  };

  const onMonthChange = (newMonth: string) => {
    const newDays = dateTree[currentYear][newMonth].sort().reverse();
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
  if (selectedWorker && selectedWorker.profile) {
    const isOwner = selectedWorker.role === 'owner';
    const profileName = selectedWorker.profile.fullName || selectedWorker.profile.username || 'Usuario';
    const maxDate = getEcuadorDateString();

    return (
      <div className="space-y-4">
        {/* Header del Detalle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              icon={<ArrowLeft size={16} />} 
              onClick={() => setSelectedWorker(null)}
              className="shrink-0"
            >
              Volver
            </Button>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Historial de {profileName}</h2>
              <div className="flex flex-col gap-0.5 mt-1">
                <p className="text-sm font-medium text-slate-600">
                  {isOwner ? 'Propietario del Galpón' : 'Trabajador del Galpón'}
                </p>
                <p className="text-xs text-slate-500">
                  Selecciona un registro de la lista para ver información más detallada.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Filtrar por fecha:</span>
            {fetchActiveDates ? (
              loadingDates ? (
                <div className="text-sm text-slate-500 py-1.5 px-3">Cargando fechas...</div>
              ) : activeDates && activeDates.length > 0 ? (
                <div className="flex items-center gap-2">
                  <select
                    value={currentYear}
                    onChange={(e) => onYearChange(e.target.value)}
                    className="border border-slate-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-primary-500 focus:border-primary-500 min-w-[80px]"
                  >
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select
                    value={currentMonth}
                    onChange={(e) => onMonthChange(e.target.value)}
                    className="border border-slate-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-primary-500 focus:border-primary-500 min-w-[120px]"
                  >
                    {availableMonths.map(m => <option key={m} value={m}>{monthNames[m]}</option>)}
                  </select>
                  <select
                    value={currentDay}
                    onChange={(e) => onDayChange(e.target.value)}
                    className="border border-slate-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:ring-primary-500 focus:border-primary-500 min-w-[70px]"
                  >
                    {availableDays.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              ) : (
                <div className="text-sm text-slate-500 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-md">Sin registros</div>
              )
            ) : (
              <Input
                type="date"
                value={selectedDate}
                max={maxDate} // No permitir fechas futuras
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            )}
          </div>
        </div>

        {/* Tabla inyectada por el módulo */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4">
          {renderTable(selectedWorker.profile.id, selectedDate)}
        </div>
      </div>
    );
  }

  // Vista Principal (Grid de Tarjetas)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => {
          const profile = member.profile;
          if (!profile) return null;

          const isOwner = member.role === 'owner';
          const initials = (profile.fullName || profile.username || 'U')
            .split(' ')
            .map((s: string) => s.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');

          const assignedCages = member.assignedCages || [];

          return (
            <button
              key={member.id}
              onClick={() => {
                setSelectedWorker(member);
                setSelectedDate(getEcuadorDateString()); // Resetear fecha al hoy al entrar
              }}
              className="flex flex-col text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 w-full border-b border-slate-100 pb-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-800 truncate">
                    {profile.fullName || profile.username}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded ${isOwner ? 'bg-slate-100 text-slate-700' : 'bg-sky-100 text-sky-700'} font-medium`}>
                      {isOwner ? 'Propietario' : 'Trabajador'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                {profile.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={14} className="text-slate-400" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                )}
                {profile.username && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <AtSign size={14} className="text-slate-400" />
                    <span className="truncate">{profile.username}</span>
                  </div>
                )}
                
                {/* Jaulas Asignadas (Solo para trabajadores) */}
                {!isOwner && (
                  <div className="mt-2 pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase mb-1.5">
                      <Box size={13} />
                      Jaulas Asignadas ({assignedCages.length})
                    </div>
                    {assignedCages.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {assignedCages.slice(0, 5).map(wc => (
                          <span key={wc.id} className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            #{wc.cage?.number ?? wc.cageId}
                          </span>
                        ))}
                        {assignedCages.length > 5 && (
                          <span className="text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            +{assignedCages.length - 5}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Ninguna</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
