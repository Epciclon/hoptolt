'use client';

import { useState } from 'react';
import { useFeeding } from '../hooks/useFeeding';
import { Table, DateTimeBadge, EventDetailsModal } from '@/shared/ui';
import type { Column } from '@/shared/ui/Table';
import type { Feeding } from '../types/feeding.types';

export function FeedingTable() {
  const { feedings, loading, error } = useFeeding();
  const [selectedFeeding, setSelectedFeeding] = useState<Feeding | null>(null);

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
      render: (row) => <DateTimeBadge dateString={row.feedingDate} />
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

      {(() => {
        const profile = selectedFeeding?.profile 
          ? selectedFeeding.profile 
          : (selectedFeeding?.profileName ? { fullName: selectedFeeding.profileName } : null);

        return (
          <EventDetailsModal
            open={!!selectedFeeding}
            onClose={() => setSelectedFeeding(null)}
            title="Detalles de Alimentación"
            description="Información detallada sobre el registro de alimentación"
            primaryDateString={selectedFeeding?.feedingDate}
            primaryDateLabel="Fecha y Hora"
            profile={profile}
            rabbits={selectedFeeding?.rabbits}
            rabbitsLabel="Conejos en Jaula"
            cageNumber={selectedFeeding?.cageNumber}
            customDetails={
              selectedFeeding && (
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 font-medium mb-1">Alimentos suministrados</p>
                    <div className="flex flex-col leading-tight mt-1">
                      <span className="text-sm font-semibold text-slate-800">
                        {selectedFeeding.foodTypes.join(', ')}
                      </span>
                    </div>
                  </div>
                  {selectedFeeding.justification && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-slate-500 font-medium mb-1">Justificación</p>
                      <div className="flex flex-col leading-tight mt-1">
                        <span className="text-sm text-slate-800">
                          {selectedFeeding.justification}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )
            }
          />
        );
      })()}
    </>
  );
}
