'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Baby, Calendar as CalendarIcon } from 'lucide-react';
import { Button, Alert, Dialog } from '@/shared/ui';
import api from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { useBirthCalendar } from '../hooks/useBirthCalendar';
import { usePermissions } from '@/modules/farmMember/hooks/usePermissions';

interface CalendarEntry {
  id: number;
  femaleId: number;
  femaleCode: string;
  femaleName?: string;
  maleId?: number | null;
  maleCode?: string | null;
  maleName?: string | null;
  mountDate: string;
  estimatedBirthDate: string;
  cageNumber?: number;
  cageType?: string;
}

type CalendarData = Record<string, CalendarEntry[]>;

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function pad(n: number) { return n.toString().padStart(2, '0'); }

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDate(dateStr: string) {
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

export function BirthCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { calendar, loading, error, fetchCalendar, fetchById } = useBirthCalendar();
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
      fetchCalendar(year, month);
    }
  }, [year, month, fetchCalendar, hasPermission, permissionsLoading]);

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

    // getDay() → 0=Sun, 1=Mon … We want Mon=0
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    // Fill trailing to complete last week
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [year, month]);

  const isToday = (day: number) => {
    return day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
  };

  const selectedEntries = selectedDate ? (calendar[selectedDate] || []) : [];

  const handleEntryClick = async (entry: CalendarEntry) => {
    setSelectedEntry(entry);
    setShowDetailsModal(true);
  };

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendario */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Header con navegación */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-600"
            >
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-lg font-semibold text-slate-800">
              {MONTHS[month - 1]} {year}
            </h3>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-600"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
            </div>
          ) : error ? (
            <div className="p-4">
              <Alert variant="error" message={error} />
            </div>
          ) : (
            <div className="p-3">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarGrid.map((day, idx) => {
                  if (day === null) return <div key={`e-${idx}`} className="aspect-square" />;

                  const dateKey = `${year}-${pad(month)}-${pad(day)}`;
                  const entries = calendar[dateKey] || [];
                  const hasEvents = entries.length > 0;
                  const isSelected = selectedDate === dateKey;

                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center
                        text-sm transition-all duration-150 relative
                        ${isToday(day) ? 'ring-2 ring-primary-400 ring-offset-1' : ''}
                        ${isSelected ? 'bg-primary-500 text-white shadow-md scale-105' : ''}
                        ${!isSelected && hasEvents ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold' : ''}
                        ${!isSelected && !hasEvents ? 'hover:bg-slate-100 text-slate-700' : ''}
                      `}
                    >
                      <span className="leading-none">{day}</span>
                      {hasEvents && (
                        <span className={`
                          text-[10px] font-bold mt-0.5 leading-none
                          ${isSelected ? 'text-white/90' : 'text-emerald-600'}
                        `}>
                          {entries.length} {entries.length === 1 ? 'parto' : 'partos'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Panel lateral: detalle del día seleccionado */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-800 text-sm">
                {selectedDate
                  ? `Partos del ${formatDate(selectedDate + 'T12:00:00')}`
                  : 'Selecciona un día'}
              </h4>
            </div>
          </div>

          <div className="p-4">
            {!selectedDate ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <CalendarIcon size={36} className="mb-2 opacity-50" />
                <p className="text-sm text-center">
                  Haz clic en un día del calendario para ver los partos estimados.
                </p>
              </div>
            ) : selectedEntries.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No hay partos estimados para este día.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedEntries.map(entry => {
                  const isHighlighted = reproductionIdParam && String(entry.id) === reproductionIdParam;
                  return (
                    <div 
                      key={entry.id} 
                      className={`border rounded-lg p-3 hover:shadow-sm transition-all
                        ${isHighlighted ? 'border-primary-500 bg-primary-50/30 ring-1 ring-primary-500 shadow-sm' : 'border-slate-200 bg-white'}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">
                            {entry.femaleCode}
                            {entry.femaleName ? ` — ${entry.femaleName}` : ''}
                          </p>
                          {entry.cageNumber && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Jaula #{entry.cageNumber} ({entry.cageType})
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Monta</p>
                          <p className="text-xs text-slate-700 font-medium">{formatDate(entry.mountDate)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Parto est.</p>
                          <p className="text-xs text-emerald-700 font-medium">{formatDate(entry.estimatedBirthDate)}</p>
                        </div>
                      </div>
                      {entry.maleCode && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Pareja / Macho</p>
                          <p className="text-xs text-slate-700 font-medium">
                            {entry.maleCode}{entry.maleName ? ` — ${entry.maleName}` : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
