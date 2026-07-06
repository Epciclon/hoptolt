'use client';

import { useState } from 'react';
import type { Cleaning } from '../types/cleaning.types';
import { useCleaning } from '../hooks/useCleaning';
import { LoadingMessage, Dialog } from '@/shared/ui';
import { Table, Column } from '@/shared/ui/Table';

export function CleaningTable() {
  const { cleanings, loading, error } = useCleaning();
  const [selectedCleaning, setSelectedCleaning] = useState<Cleaning | null>(null);

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

  if (loading) return <LoadingMessage message="Cargando limpiezas..." />;
  if (error) return <div className="text-red-600 py-8 text-center">{error}</div>;

  const columns: Column<Cleaning>[] = [
    {
      key: 'cage',
      header: 'Jaula',
      className: 'font-medium text-slate-900',
      render: (row) => row.cageNumber.toString()
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
      render: (row) => formatDateTime(row.cleaningDate)
    }
  ];

  return (
    <>
      <Table
        data={cleanings}
        columns={columns}
        emptyMessage="No hay registros de limpieza"
        rowKey={(row) => row.id}
        onRowClick={(row) => setSelectedCleaning(row)}
      />

      <Dialog
        open={!!selectedCleaning}
        onClose={() => setSelectedCleaning(null)}
        title="Detalles de Limpieza"
        description="Información detallada sobre el registro de limpieza"
        size="md"
      >
        {selectedCleaning && (
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Jaula</p>
                <div className="flex flex-col leading-tight mt-1">
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedCleaning.cageNumber}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Fecha y Hora de Limpieza</p>
                <div className="flex flex-col leading-tight mt-1">
                  {(() => {
                    const date = new Date(selectedCleaning.cleaningDate);
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
                    {selectedCleaning.profile?.fullName || selectedCleaning.profile?.username || 'Sistema'}
                  </span>
                  {selectedCleaning.profile?.username && (
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                      @{selectedCleaning.profile.username}
                    </span>
                  )}
                  {selectedCleaning.profile?.email && (
                    <span className="text-[10px] text-slate-400 mt-0.5 break-all">
                      {selectedCleaning.profile.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
              <p className="text-xs text-slate-500 font-medium mb-3">Conejos en Jaula</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedCleaning.rabbits && selectedCleaning.rabbits.length > 0 ? (
                  selectedCleaning.rabbits.map((rabbit, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white border border-slate-100 rounded-lg p-2">
                      {rabbit.imageUrl ? (
                        <img 
                          src={rabbit.imageUrl} 
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
                          {rabbit.name || 'Sin nombre'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {rabbit.code}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {rabbit.race || 'Raza N/A'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No hay conejos registrados en esta jaula</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
