'use client';

import { useState } from 'react';
import type { Deworming } from '../types/deworming.types';
import { useDeworming } from '../hooks/useDeworming';
import { LoadingMessage, Dialog, Badge } from '@/shared/ui';
import { Table, Column } from '@/shared/ui/Table';

export function DewormingTable() {
  const { dewormings, loading, error, dewormingPeriod } = useDeworming();
  const [selectedDeworming, setSelectedDeworming] = useState<Deworming | null>(null);

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    const formattedDate = ecuadorDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = ecuadorDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true });
    return (
      <div className="flex flex-col">
        <span className="text-slate-800">{formattedDate}</span>
        <span className="text-[11px] text-slate-500">{formattedTime}</span>
      </div>
    );
  };

  const calculateNextDeworming = (deworming: Deworming) => {
    if (!dewormingPeriod) return null;

    const date = new Date(deworming.dewormingDate);
    const nextDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    nextDate.setDate(nextDate.getDate() + dewormingPeriod);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDateMid = new Date(nextDate.getTime());
    nextDateMid.setHours(0, 0, 0, 0);

    const diffTime = nextDateMid.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { nextDate, diffDays, period: dewormingPeriod };
  };

  if (loading) return <LoadingMessage message="Cargando desparasitaciones..." />;
  if (error) return <div className="text-red-600 py-8 text-center">{error}</div>;

  const columns: Column<Deworming>[] = [
    {
      key: 'rabbit',
      header: 'Conejo',
      className: 'font-medium text-slate-900',
      render: (row) => row.rabbit ? (
        <div className="flex flex-col">
          <span className="text-slate-900 font-medium">{row.rabbit.name || 'Sin nombre'}</span>
          <span className="text-[11px] text-slate-500">{row.rabbit.code}</span>
        </div>
      ) : row.rabbitCode
    },
    {
      key: 'race',
      header: 'Raza',
      className: 'text-slate-600',
      render: (row) => row.rabbit?.race || 'N/A'
    },
    {
      key: 'responsible',
      header: 'Reportado por',
      className: 'text-slate-600',
      render: (row) => row.profile?.fullName || row.profile?.username || 'N/A'
    },
    {
      key: 'date',
      header: 'Fecha y Hora',
      render: (row) => formatDateTime(row.dewormingDate)
    }
  ];

  return (
    <>
      <Table
        data={dewormings}
        columns={columns}
        emptyMessage="No hay registros de desparasitación"
        rowKey={(row) => row.id}
        onRowClick={(row) => setSelectedDeworming(row)}
      />

      <Dialog
        open={!!selectedDeworming}
        onClose={() => setSelectedDeworming(null)}
        title="Detalles de Desparasitación"
        description="Información detallada sobre el registro de desparasitación"
        size="md"
      >
        {selectedDeworming && (() => {
          const nextDeworm = calculateNextDeworming(selectedDeworming);
          
          return (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500 font-medium mb-1">Conejo</p>
                  <div className="flex items-center gap-3">
                    {selectedDeworming.rabbit?.imageUrl ? (
                      <img 
                        src={selectedDeworming.rabbit.imageUrl} 
                        alt="Conejo" 
                        className="w-10 h-10 flex-shrink-0 rounded-full object-cover shadow-sm border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 text-[9px] text-center leading-tight px-1">
                        Sin foto
                      </div>
                    )}
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-slate-800 text-sm">
                        {selectedDeworming.rabbit?.name || 'Sin nombre'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {selectedDeworming.rabbit?.code || selectedDeworming.rabbitCode}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {selectedDeworming.rabbit?.race || 'Raza N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500 font-medium mb-1">Fecha y Hora de Aplicación</p>
                  <div className="flex flex-col leading-tight mt-1">
                    {(() => {
                      const date = new Date(selectedDeworming.dewormingDate);
                      const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
                      const formattedDate = ecuadorDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      const formattedTime = ecuadorDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true });
                      return (
                        <>
                          <span className="text-sm font-semibold text-slate-800">{formattedDate}</span>
                          <span className="text-[11px] text-slate-500 font-medium mt-0.5">{formattedTime}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-slate-500 font-medium mb-1">Reportado por</p>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold text-slate-800">
                      {selectedDeworming.profile?.fullName || selectedDeworming.profile?.username || 'Sistema'}
                    </span>
                    {selectedDeworming.profile?.username && (
                      <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                        @{selectedDeworming.profile.username}
                      </span>
                    )}
                    {selectedDeworming.profile?.email && (
                      <span className="text-[10px] text-slate-400 mt-0.5 break-all">
                        {selectedDeworming.profile.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-slate-500 font-medium mb-3">Seguimiento de Desparasitación</p>
                <div className="flex flex-col leading-tight border border-slate-100 rounded bg-white p-3 justify-center">
                  {nextDeworm ? (
                    <>
                      <span className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-2">
                        {nextDeworm.nextDate.toLocaleDateString('es-EC')} a las {nextDeworm.nextDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                      {nextDeworm.diffDays > 0 ? (
                        <span className="text-[12px] text-slate-600 font-medium">
                          Faltan {nextDeworm.diffDays} día{nextDeworm.diffDays !== 1 ? 's' : ''}
                        </span>
                      ) : nextDeworm.diffDays === 0 ? (
                        <span className="text-[12px] text-slate-700 font-bold">
                          Toca hoy
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-600 font-medium">
                          Atrasada {Math.abs(nextDeworm.diffDays)} día{Math.abs(nextDeworm.diffDays) !== 1 ? 's' : ''}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-slate-400 border-b border-slate-100 pb-2 mb-2">
                        Sin fecha
                      </span>
                      <span className="text-[12px] text-slate-500 font-medium">
                        Sin período configurado
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Dialog>
    </>
  );
}
