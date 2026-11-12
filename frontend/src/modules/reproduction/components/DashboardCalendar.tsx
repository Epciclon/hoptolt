'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Baby, Heart, CalendarDays } from 'lucide-react';
import { Alert, Dialog, Button, FilterBar, RabbitAvatar } from '@/shared/ui';
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

interface CalendarCell {
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  dateKey: string;
}

/** Returns CSS class strings for a calendar day cell based on event/state context. */
function getDayStyles(
  calendarType: CalendarEventType,
  hasEvents: boolean,
  isDayToday: boolean,
  canViewReproduction: boolean,
  isCurrentMonth: boolean
): { bgClass: string; eventTextClass: string; glowClass: string } {
  if (!isCurrentMonth) {
    return {
      bgClass: 'opacity-30 hover:opacity-75 text-theme-faint bg-transparent hover:bg-theme-surface/50 border-transparent cursor-pointer',
      eventTextClass: 'text-theme-faint',
      glowClass: '',
    };
  }
  if (hasEvents && canViewReproduction) {
    if (calendarType === 'births') {
      return {
        bgClass: 'bg-emerald-500/15 hover:bg-emerald-500/25 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-200 font-semibold border-emerald-500/40',
        eventTextClass: 'text-emerald-600 dark:text-emerald-400',
        glowClass: 'shadow-[0_0_12px_rgba(16,185,129,0.35)]',
      };
    }
    if (calendarType === 'receptive') {
      return {
        bgClass: 'bg-pink-500/15 hover:bg-pink-500/25 dark:bg-pink-500/20 dark:hover:bg-pink-500/30 text-pink-800 dark:text-pink-200 font-semibold border-pink-500/40',
        eventTextClass: 'text-pink-600 dark:text-pink-400',
        glowClass: 'shadow-[0_0_12px_rgba(236,72,153,0.35)]',
      };
    }
    return {
      bgClass: 'bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 font-semibold border-amber-500/40',
      eventTextClass: 'text-amber-600 dark:text-amber-400',
      glowClass: 'shadow-[0_0_12px_rgba(245,158,11,0.35)]',
    };
  }
  if (isDayToday) {
    return {
      bgClass: 'bg-slate-200/80 hover:bg-slate-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-main font-bold border-transparent',
      eventTextClass: 'text-muted',
      glowClass: '',
    };
  }
  if (!hasEvents) {
    return {
      bgClass: 'opacity-65 cursor-default bg-theme-surface/80 hover:bg-theme-surface/80 border-default/70 text-main',
      eventTextClass: 'text-muted',
      glowClass: '',
    };
  }
  return {
    bgClass: 'hover:bg-theme-surface border border-default text-main',
    eventTextClass: 'text-muted',
    glowClass: '',
  };
}

export function DashboardCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarType, setCalendarType] = useState<CalendarEventType>('births');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { calendar, error, fetchCalendar } = useDashboardCalendar();
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

  // Build calendar grid with previous and next month days
  const calendarGrid = useMemo<CalendarCell[]>(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();

    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const cells: CalendarCell[] = [];

    // Días del mes anterior para rellenar la primera semana
    if (startOffset > 0) {
      const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonth = month === 1 ? 12 : month - 1;
      for (let i = startOffset - 1; i >= 0; i--) {
        const d = prevMonthLastDay - i;
        cells.push({
          day: d,
          month: prevMonth,
          year: prevYear,
          isCurrentMonth: false,
          dateKey: `${prevYear}-${pad(prevMonth)}-${pad(d)}`,
        });
      }
    }

    // Días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      cells.push({
        day: d,
        month,
        year,
        isCurrentMonth: true,
        dateKey: `${year}-${pad(month)}-${pad(d)}`,
      });
    }

    // Días del mes siguiente para completar la última semana
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        day: nextDay,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
        dateKey: `${nextYear}-${pad(nextMonth)}-${pad(nextDay)}`,
      });
      nextDay++;
    }

    return cells;
  }, [year, month]);

  const isToday = (cell: CalendarCell) => {
    return (
      cell.isCurrentMonth &&
      cell.day === now.getDate() &&
      month === now.getMonth() + 1 &&
      year === now.getFullYear()
    );
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
      {/* Selector de tipo de calendario */}
      {canViewReproduction && (
        <div className="flex bg-theme-surface border border-default p-1 rounded-xl w-full max-w-xl mx-auto mb-4 relative">
          <button type="button"
            onClick={() => { setCalendarType('births'); setSelectedDate(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              calendarType === 'births' ? 'bg-card text-emerald-700 dark:text-emerald-400 shadow-sm border border-default font-semibold' : 'text-muted hover:text-main'
            }`}
          >
            {typeConfig.births.icon}
            <span className="truncate">
              <span className="sm:hidden">Partos</span>
              <span className="hidden sm:inline">{typeConfig.births.label}</span>
            </span>
          </button>
          <button type="button"
            onClick={() => { setCalendarType('receptive'); setSelectedDate(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              calendarType === 'receptive' ? 'bg-card text-pink-700 dark:text-pink-400 shadow-sm border border-default font-semibold' : 'text-muted hover:text-main'
            }`}
          >
            {typeConfig.receptive.icon}
            <span className="truncate">
              <span className="sm:hidden">Celo</span>
              <span className="hidden sm:inline">{typeConfig.receptive.label}</span>
            </span>
          </button>
          <button type="button"
            onClick={() => { setCalendarType('weaning'); setSelectedDate(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              calendarType === 'weaning' ? 'bg-card text-amber-700 dark:text-amber-400 shadow-sm border border-default font-semibold' : 'text-muted hover:text-main'
            }`}
          >
            {typeConfig.weaning.icon}
            <span className="truncate">
              <span className="sm:hidden">Destetes</span>
              <span className="hidden sm:inline">{typeConfig.weaning.label}</span>
            </span>
          </button>
        </div>
      )}

      <div className="bg-card rounded-xl border border-strong overflow-hidden w-full max-w-xl mx-auto">
        {/* Header con navegación */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-default bg-theme-surface">
          <button type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-muted"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col items-center">
            <h3 className="text-base sm:text-lg font-semibold text-main flex items-center gap-2">
              {MONTHS[month - 1]} {year}
            </h3>
          </div>
          <button type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-muted"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {error ? (
          <div className="p-4">
            <Alert variant="error" message={error} />
          </div>
        ) : (
          <div className="p-2 sm:p-3">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-muted py-1 sm:py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarGrid.map((cell) => {
                const isDayToday = isToday(cell);
                const isSelected = selectedDate === cell.dateKey;
                const entries = cell.isCurrentMonth ? ((calendar as CalendarData)[cell.dateKey] || []) : [];
                const hasEvents = entries.length > 0;
                const { bgClass, eventTextClass, glowClass } = getDayStyles(
                  calendarType,
                  hasEvents,
                  isDayToday,
                  canViewReproduction,
                  cell.isCurrentMonth
                );

                const handleClick = () => {
                  if (!cell.isCurrentMonth) {
                    setYear(cell.year);
                    setMonth(cell.month);
                    setSelectedDate(null);
                    return;
                  }
                  if (hasEvents && canViewReproduction) {
                    setSelectedDate(cell.dateKey);
                  }
                };

                return (
                  <button
                    type="button"
                    key={cell.dateKey}
                    onClick={handleClick}
                    disabled={cell.isCurrentMonth && (!hasEvents || !canViewReproduction)}
                    className={`
                      w-full h-12 sm:h-16 rounded-xl flex flex-col items-center justify-center
                      p-1 text-sm transition-all duration-150 relative border overflow-hidden
                      ${isDayToday ? 'ring-2 ring-primary-500/80 ring-offset-1 border-primary-500 shadow-sm z-10' : ''}
                      ${isSelected ? 'ring-2 ring-slate-800 dark:ring-white ring-offset-1 scale-105 z-20' : ''}
                      ${bgClass} ${hasEvents && canViewReproduction ? `${glowClass} shadow-sm cursor-pointer` : ''}
                    `}
                  >
                    <span className={`text-sm sm:text-base leading-none ${hasEvents && canViewReproduction ? 'font-bold' : 'font-medium'}`}>
                      {cell.day}
                    </span>

                    {/* Vista tablet y desktop: texto con cantidad y etiqueta */}
                    {cell.isCurrentMonth && hasEvents && canViewReproduction && (
                      <span className={`
                        hidden sm:block text-[11px] font-bold mt-1 leading-none truncate max-w-full px-1
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
        size="lg"
      >
        <div className="max-h-[65vh] overflow-y-auto px-1 py-1 flex flex-col gap-3">
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
            <div className={`grid gap-3.5 ${filteredEntries.length === 1 ? 'grid-cols-1 max-w-sm mx-auto w-full' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {filteredEntries.map(entry => {
                const isHighlighted = reproductionIdParam && String(entry.id) === reproductionIdParam;
                return (
                  <div
                    key={entry.id}
                    className={`border rounded-2xl p-4 flex flex-col items-center text-center bg-card shadow-sm transition-all relative overflow-hidden
                      ${isHighlighted ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-strong'}
                    `}
                  >
                    {/* 1. Foto / Avatar primero arriba */}
                    <div className="flex flex-col items-center justify-center pt-1 pb-2">
                      <RabbitAvatar
                        imageUrl={entry.femaleImageUrl}
                        alt={entry.femaleName || entry.femaleCode}
                        size="xl"
                        ring
                        rabbitCode={entry.femaleCode}
                      />
                    </div>

                    {/* 2. Nombre del conejo completo sin cortes ni truncado */}
                    <h4 className="font-bold text-main text-base sm:text-lg break-words text-center leading-snug w-full px-1">
                      {entry.femaleName || 'Sin Nombre'}
                    </h4>

                    {/* 3. Código y Jaula centrados debajo */}
                    <div className="flex flex-col items-center justify-center gap-1 mt-1 mb-3">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-theme-surface text-muted border border-default">
                        {entry.femaleCode}
                      </span>
                      {entry.cageNumber && (
                        <span className="text-xs text-muted font-medium">
                          Jaula {entry.cageNumber}
                        </span>
                      )}
                    </div>

                    {/* 4. Bloque de fechas a ancho completo */}
                    <div className="w-full bg-theme-surface rounded-xl p-3 border border-default/70 mt-auto">
                      {calendarType === 'births' && (
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-3 divide-x divide-default/70 text-center">
                          <div className="min-w-0 pr-1 sm:pr-2">
                            <p className="text-[10px] uppercase tracking-wider text-theme-faint font-bold mb-0.5 truncate">
                              Monta
                            </p>
                            <p className="text-xs sm:text-sm text-main font-semibold whitespace-nowrap">
                              {formatDate(entry.mountDate)}
                            </p>
                          </div>
                          <div className="min-w-0 pl-1 sm:pl-2">
                            <p className="text-[10px] uppercase tracking-wider text-theme-faint font-bold mb-0.5 truncate">
                              Parto Est.
                            </p>
                            <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                              {formatDate(entry.estimatedBirthDate)}
                            </p>
                          </div>
                        </div>
                      )}

                      {calendarType === 'weaning' && (
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-3 divide-x divide-default/70 text-center">
                          <div className="min-w-0 pr-1 sm:pr-2">
                            <p className="text-[10px] uppercase tracking-wider text-theme-faint font-bold mb-0.5 truncate">
                              Parto Est.
                            </p>
                            <p className="text-xs sm:text-sm text-main font-semibold whitespace-nowrap">
                              {formatDate(entry.estimatedBirthDate)}
                            </p>
                          </div>
                          <div className="min-w-0 pl-1 sm:pl-2">
                            <p className="text-[10px] uppercase tracking-wider text-theme-faint font-bold mb-0.5 truncate">
                              Destete Est.
                            </p>
                            <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">
                              {formatDate(entry.estimatedWeaningDate)}
                            </p>
                          </div>
                        </div>
                      )}

                      {calendarType === 'receptive' && (
                        <div className="w-full text-center py-0.5">
                          <p className="text-[10px] uppercase tracking-wider text-theme-faint font-bold mb-0.5">
                            Disponible Desde
                          </p>
                          <p className="text-xs sm:text-sm text-pink-600 dark:text-pink-400 font-semibold whitespace-nowrap">
                            {formatDate(entry.receptiveDate)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 5. Pareja macho si existe */}
                    {entry.maleCode && calendarType !== 'receptive' && (
                      <div className="w-full flex items-center justify-center gap-2.5 pt-2.5 mt-2.5 border-t border-default/70 min-w-0">
                        <RabbitAvatar
                          imageUrl={entry.maleImageUrl}
                          alt={entry.maleName || entry.maleCode}
                          size="sm"
                          rabbitId={entry.maleId}
                          rabbitCode={entry.maleCode}
                        />
                        <div className="min-w-0 text-left">
                          <p className="text-[10px] uppercase tracking-wider text-theme-faint font-bold leading-none mb-0.5">
                            Pareja Macho
                          </p>
                          <p className="text-xs text-main font-medium truncate leading-tight">
                            {entry.maleName || 'Sin Nombre'}
                          </p>
                          <p className="text-[11px] text-muted font-normal leading-tight mt-0.5 truncate">
                            {entry.maleCode}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end pt-3 border-t border-default">
          <Button variant="outline" onClick={() => { setSelectedDate(null); setSearchTerm(''); }}>
            Cerrar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
