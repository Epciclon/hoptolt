'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Baby, Heart, CalendarDays } from 'lucide-react';
import { Alert, Dialog, Button, FilterBar } from '@/shared/ui';
import { useSearchParams } from 'next/navigation';
import { useDashboardCalendar } from '../hooks/useDashboardCalendar';
import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';

export type CalendarEventType = 'births' | 'weaning' | 'receptive';

interface CalendarEntry {
  id: string | number;
  femaleId: number;
  femaleCode: string;
  femaleName?: string;
  femaleImageUrl?: string | null;
  maleId?: number | null;
  maleCode?: string | null;
  maleName?: string | null;
  maleImageUrl?: string | null;
  mountDate?: string;
  estimatedBirthDate?: string;
  estimatedWeaningDate?: string;
  receptiveDate?: string;
  cageNumber?: number;
  cageType?: string;
  type: CalendarEventType;
}

type CalendarData = Record<string, CalendarEntry[]>;

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function pad(n: number) { return n.toString().padStart(2, '0'); }

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Guayaquil' });
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
}


/** Returns CSS class strings for a calendar day cell based on event/state context. */
function getDayStyles(
  calendarType: CalendarEventType,
  hasEvents: boolean,
  isDayToday: boolean,
  canViewReproduction: boolean
): { bgClass: string; eventTextClass: string } {
  if (hasEvents && canViewReproduction) {
    if (calendarType === 'births') return { bgClass: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold', eventTextClass: 'text-emerald-600' };
    if (calendarType === 'receptive') return { bgClass: 'bg-pink-50 hover:bg-pink-100 text-pink-800 font-semibold', eventTextClass: 'text-pink-600' };
    return { bgClass: 'bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold', eventTextClass: 'text-amber-600' };
  }
  if (isDayToday) return { bgClass: 'bg-slate-200/80 hover:bg-slate-200 text-main font-bold', eventTextClass: 'text-muted' };
  if (!hasEvents) return { bgClass: 'opacity-50 cursor-default bg-theme-surface hover:bg-theme-surface', eventTextClass: 'text-muted' };
  return { bgClass: 'hover:bg-theme-surface border border-default text-main', eventTextClass: 'text-muted' };
}

export function DashboardCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarType, setCalendarType] = useState<CalendarEventType>('births');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { calendar, isFetching, error, fetchCalendar } = useDashboardCalendar();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const reproductionIdParam = searchParams.get('reproductionId');

  useEffect(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [pYear, pMonth] = dateParam.split('-').map(Number);
      setYear(pYear);
      setMonth(pMonth);
      setSelectedDate(dateParam);
    }
  }, [dateParam]);

  useEffect(() => {
    if (permissionsLoading) return;
    if (hasPermission('reproduction')) {
      fetchCalendar(year, month, calendarType);
    }
  }, [year, month, calendarType, fetchCalendar, hasPermission, permissionsLoading]);

  // Navigate months
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  // Build calendar grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();

    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [year, month]);

  const isToday = (day: number) => {
    return day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
  };

  const selectedEntries = selectedDate ? ((calendar as CalendarData)[selectedDate] || []) : [];
  
  const filteredEntries = selectedEntries.filter(entry => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      entry.femaleCode.toLowerCase().includes(term) ||
      entry.femaleName?.toLowerCase().includes(term)
    );
  });

  const typeConfig = {
    births: {
      label: 'Partos Estimados',
      icon: <Baby size={16} />,
      color: 'emerald',
      eventLabel: 'parto',
      eventsLabel: 'partos',
      dateTitle: 'Partos del'
    },
    receptive: {
      label: 'Conejas en Celo',
      icon: <Heart size={16} />,
      color: 'pink',
      eventLabel: 'coneja',
      eventsLabel: 'conejas',
      dateTitle: 'Celo desde el'
    },
    weaning: {
      label: 'Destetes Estimados',
      icon: <CalendarDays size={16} />,
      color: 'amber',
      eventLabel: 'destete',
      eventsLabel: 'destetes',
      dateTitle: 'Destetes del'
    }
  };

  const currentConfig = typeConfig[calendarType];
  const canViewReproduction = !permissionsLoading && hasPermission('reproduction');

  return (
    <div className="space-y-4 relative px-1">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-main">
          {canViewReproduction ? "Calendario de Eventos" : "Calendario General"}
        </h3>
        {canViewReproduction && (
          <p className="text-sm text-muted mt-0.5">
            Alterna entre las vistas para ver los partos, destetes o conejas en celo.
          </p>
        )}
      </div>

      {/* Selector de tipo de calendario */}
      {canViewReproduction && (
        <div className="flex bg-theme-surface border border-default p-1 rounded-lg w-full max-w-2xl mx-auto mb-4 relative overflow-hidden">
        {isFetching && (
          <div className="absolute top-0 left-0 w-full h-0.5 bg-slate-200">
            <div className="h-full bg-primary-500 animate-pulse w-full"></div>
          </div>
        )}
        <button type="button"
          onClick={() => { setCalendarType('births'); setSelectedDate(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            calendarType === 'births' ? 'bg-card text-emerald-700 dark:text-emerald-400 shadow-sm border border-default' : 'text-muted hover:text-main'
          }`}
        >
          {typeConfig.births.icon} <span className="hidden sm:inline">{typeConfig.births.label}</span>
        </button>
        <button type="button"
          onClick={() => { setCalendarType('receptive'); setSelectedDate(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            calendarType === 'receptive' ? 'bg-card text-pink-700 dark:text-pink-400 shadow-sm border border-default' : 'text-muted hover:text-main'
          }`}
        >
          {typeConfig.receptive.icon} <span className="hidden sm:inline">{typeConfig.receptive.label}</span>
        </button>
        <button type="button"
          onClick={() => { setCalendarType('weaning'); setSelectedDate(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            calendarType === 'weaning' ? 'bg-card text-amber-700 dark:text-amber-400 shadow-sm border border-default' : 'text-muted hover:text-main'
          }`}
        >
          {typeConfig.weaning.icon} <span className="hidden sm:inline">{typeConfig.weaning.label}</span>
        </button>
      </div>
      )}

      <div className="bg-card rounded-xl border border-strong overflow-hidden w-full max-w-3xl mx-auto">
        {/* Header con navegación */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-default bg-theme-surface">
          <button type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-muted"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold text-main flex items-center gap-2">
              {MONTHS[month - 1]} {year}
            </h3>
          </div>
          <button type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-muted"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {error ? (
          <div className="p-4">
            <Alert variant="error" message={error} />
          </div>
        ) : (
          <div className="p-3">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-muted py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarGrid.map((day, idx) => {
                if (day === null) return <div key={`empty-${String(idx)}`} className="h-16 sm:h-20" />;

                const dateKey = `${year}-${pad(month)}-${pad(day)}`;
                const entries = (calendar as CalendarData)[dateKey] || [];
                const hasEvents = entries.length > 0;
                const isDayToday = isToday(day);
                const isSelected = selectedDate === dateKey;
                const { bgClass, eventTextClass } = getDayStyles(calendarType, hasEvents, isDayToday, canViewReproduction);

                return (
                  <button type="button"
                    key={dateKey}
                    onClick={() => { if (hasEvents && canViewReproduction) setSelectedDate(dateKey); }}
                    disabled={!hasEvents || !canViewReproduction}
                    className={`
                      h-16 sm:h-20 rounded-lg flex flex-col items-center justify-center
                      text-sm transition-all duration-150 relative border
                      ${isDayToday ? 'ring-2 ring-slate-400 ring-offset-1 border-slate-400 shadow-sm z-10' : 'border-transparent'}
                      ${isSelected ? 'ring-2 ring-slate-800 ring-offset-1 scale-105 z-20' : ''}
                      ${bgClass} ${hasEvents && canViewReproduction ? 'shadow-sm cursor-pointer' : ''}
                    `}
                  >
                    <span className={`text-base sm:text-lg ${hasEvents && canViewReproduction ? 'font-bold' : ''}`}>{day}</span>
                    {hasEvents && canViewReproduction && (
                      <span className={`
                        text-[10px] sm:text-xs font-bold mt-0.5 sm:mt-1 leading-none
                        ${isSelected ? 'text-main' : eventTextClass}
                      `}>
                        {entries.length} {entries.length === 1 ? currentConfig.eventLabel : currentConfig.eventsLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal para detalles del día seleccionado */}
      <Dialog
        open={!!selectedDate}
        onClose={() => { setSelectedDate(null); setSearchTerm(''); }}
        title={`${currentConfig.dateTitle} ${selectedDate ? formatDate(selectedDate + 'T12:00:00') : ''}`}
      >
        <div className="max-h-[60vh] overflow-y-auto px-1 py-2 flex flex-col gap-4">
          {selectedEntries.length > 5 && (
            <div className="sticky top-0 z-10 bg-card pb-2 pt-1">
              <FilterBar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar coneja por código o nombre..."
                filters={[]}
              />
            </div>
          )}
          
          {filteredEntries.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              {searchTerm ? 'No se encontraron resultados para la búsqueda.' : 'No hay eventos para este día.'}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredEntries.map(entry => {
                const isHighlighted = reproductionIdParam && String(entry.id) === reproductionIdParam;
                return (
                  <div
                    key={entry.id}
                    className={`border rounded-xl p-4 flex gap-4 items-start bg-card shadow-sm transition-all
                      ${isHighlighted ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-strong'}
                    `}
                  >
                    {entry.femaleImageUrl ? (
                      <img src={entry.femaleImageUrl} alt={entry.femaleName || entry.femaleCode} className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-full object-cover shadow-sm border border-strong" />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-theme-surface border border-default rounded-full flex items-center justify-center border border-strong">
                        <span className="text-theme-faint text-xs font-medium text-center leading-tight">Sin Foto</span>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="truncate">
                          <p className="font-bold text-main text-base truncate">
                            {entry.femaleName || 'Sin Nombre'}
                            <span className="ml-2 text-sm font-medium text-muted">
                              {entry.femaleCode}
                            </span>
                          </p>
                          {entry.cageNumber && (
                            <p className="text-xs text-muted mt-0.5 flex items-center gap-1 truncate">
                              Jaula #{entry.cageNumber} {entry.cageType ? `(${entry.cageType})` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 flex flex-col sm:flex-row gap-3 p-3 bg-theme-surface rounded-lg">
                        {calendarType === 'births' && (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-theme-faint font-bold mb-0.5 truncate">Monta</p>
                              <p className="text-xs text-main font-medium truncate">{formatDate(entry.mountDate)}</p>
                            </div>
                            <div className="flex-1 min-w-0 border-t sm:border-t-0 sm:border-l border-strong pt-2 sm:pt-0 sm:pl-3">
                              <p className="text-[10px] uppercase tracking-wider text-theme-faint font-bold mb-0.5 truncate">Parto Est.</p>
                              <p className="text-xs text-main font-medium truncate">{formatDate(entry.estimatedBirthDate)}</p>
                            </div>
                          </>
                        )}

                        {calendarType === 'weaning' && (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-theme-faint font-bold mb-0.5 truncate">Parto Est.</p>
                              <p className="text-xs text-main font-medium truncate">{formatDate(entry.estimatedBirthDate)}</p>
                            </div>
                            <div className="flex-1 min-w-0 border-t sm:border-t-0 sm:border-l border-strong pt-2 sm:pt-0 sm:pl-3">
                              <p className="text-[10px] uppercase tracking-wider text-theme-faint font-bold mb-0.5 truncate">Destete Est.</p>
                              <p className="text-xs text-main font-medium truncate">{formatDate(entry.estimatedWeaningDate)}</p>
                            </div>
                          </>
                        )}

                        {calendarType === 'receptive' && (
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-theme-faint font-bold mb-0.5 truncate">Disponible Desde</p>
                            <p className="text-sm text-main font-medium truncate">{formatDate(entry.receptiveDate)}</p>
                          </div>
                        )}
                      </div>

                      {entry.maleCode && calendarType !== 'receptive' && (
                        <div className="mt-3 flex items-center gap-2 border-t border-default pt-3 min-w-0">
                          {entry.maleImageUrl ? (
                            <img src={entry.maleImageUrl} alt={entry.maleName || entry.maleCode} className="w-10 h-10 flex-shrink-0 rounded-full object-cover shadow-sm border border-strong" />
                          ) : (
                            <div className="w-10 h-10 flex-shrink-0 bg-theme-surface border border-default rounded-full flex items-center justify-center border border-strong">
                              <span className="text-theme-faint text-[8px] font-medium uppercase text-center leading-tight">Sin Foto</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-wider text-theme-faint font-bold mb-0.5 truncate">Pareja (Macho)</p>
                            <p className="text-xs text-main font-medium truncate">
                              {entry.maleName || 'Sin Nombre'} <span className="text-muted">({entry.maleCode})</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end pt-4 border-t border-default">
          <Button variant="outline" onClick={() => { setSelectedDate(null); setSearchTerm(''); }}>
            Cerrar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
