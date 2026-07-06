'use client';

import { useState } from 'react';
import { useFeeding } from '../hooks/useFeeding';
import { Table, Dialog } from '@/shared/ui';
import type { Column } from '@/shared/ui/Table';
import type { Feeding } from '../types/feeding.types';

export function FeedingTable() {
  const { feedings, loading, error } = useFeeding();
  const [selectedFeeding, setSelectedFeeding] = useState<Feeding | null>(null);

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    const formattedDate = ecuadorDate.toLocaleDateString('es-EC', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const formattedTime = ecuadorDate.toLocaleTimeString('es-EC', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    return (
      <div className="flex flex-col">
        <span className="text-slate-800">{formattedDate}</span>
        <span className="text-[11px] text-slate-500">{formattedTime}</span>
      </div>
    );
  };

  const columns: Column<any>[] = [
    { 
      key: 'cageNumber', 
      header: 'Jaula',
      className: 'font-medium text-slate-900',
      render: (row) => row.cageNumber?.toString() || '-'
    },
    {
      key: 'profileName',
      header: 'Reportado por',
      className: 'text-slate-600',
      render: (row) => row.profileName || 'Desconocido'
    },
    { 
      key: 'feedingDate', 
      header: 'Fecha y Hora',
      render: (row) => formatDateTime(row.feedingDate)
    },
    { 
      key: 'shift', 
      header: 'Turno',
      render: (row) => row.shift === 'mañana' ? 'Mañana' : 'Tarde'
    },
    { 
      key: 'foodTypes', 
      header: 'Alimentos',
      render: (row) => row.foodTypes.join(', ')
    }
  ];

  return (
    <>
      {error && <div className="text-red-600 py-4">{error}</div>}
      <Table
        columns={columns}
        data={feedings}
        loading={loading}
        rowKey={(row) => row.id.toString()}
        emptyMessage="No hay registros de alimentación."
        onRowClick={(row) => setSelectedFeeding(row)}
      />

      <Dialog
        open={!!selectedFeeding}
        onClose={() => setSelectedFeeding(null)}
        title="Detalles de Alimentación"
        description="Información detallada sobre el registro de alimentación"
        size="md"
      >
        {selectedFeeding && (
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Jaula</p>
                <div className="flex flex-col leading-tight mt-1">
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedFeeding.cageNumber || '-'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Fecha y Hora</p>
                <div className="flex flex-col leading-tight mt-1">
                  {(() => {
                    const date = new Date(selectedFeeding.feedingDate);
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

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Reportado por</p>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedFeeding.profile?.fullName || selectedFeeding.profile?.username || selectedFeeding.profileName || 'Sistema'}
                  </span>
                  {selectedFeeding.profile?.username && (
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                      @{selectedFeeding.profile.username}
                    </span>
                  )}
                  {selectedFeeding.profile?.email && (
                    <span className="text-[10px] text-slate-400 mt-0.5 break-all">
                      {selectedFeeding.profile.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Alimentos suministrados</p>
                <div className="flex flex-col leading-tight mt-1">
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedFeeding.foodTypes.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
              <p className="text-xs text-slate-500 font-medium mb-3">Conejos en Jaula</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedFeeding.rabbits && selectedFeeding.rabbits.length > 0 ? (
                  selectedFeeding.rabbits.map((rabbit, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white border border-slate-100 rounded-lg p-2 shadow-sm">
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

            {selectedFeeding.justification && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-slate-500 font-medium mb-1">Justificación</p>
                <div className="flex flex-col leading-tight mt-1">
                  <span className="text-sm text-slate-800">
                    {selectedFeeding.justification}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
