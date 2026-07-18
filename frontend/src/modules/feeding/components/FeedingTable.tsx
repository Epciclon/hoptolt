'use client';

import { useState } from 'react';
import { useFeeding } from '../hooks/useFeeding';
import { Table, DateTimeBadge, EventDetailsModal } from '@/shared/ui';
import type { Column } from '@/shared/ui/Table';
import type { Feeding } from '../types/feeding.types';

interface FeedingTableProps {
  readonly profileId?: string;
  readonly date?: string;
}

export function FeedingTable({ profileId, date }: FeedingTableProps) {
  const { feedings, loading, error } = useFeeding({ profileId, date });
  const [selectedFeeding, setSelectedFeeding] = useState<Feeding | null>(null);

  const columns: Column<any>[] = [
    { 
      key: 'cageNumber', 
      header: 'Jaula',
      className: 'font-medium text-main',
      render: (row) => row.cageNumber?.toString() || '-'
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

  let profile = null;
  if (selectedFeeding?.profile) {
    profile = selectedFeeding.profile;
  } else if (selectedFeeding?.profileName) {
    profile = { fullName: selectedFeeding.profileName };
  }

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
              <div className="bg-theme-surface border border-strong rounded-lg p-3">
                <p className="text-xs text-muted font-medium mb-1">Alimentos suministrados</p>
                <div className="flex flex-col leading-tight mt-1">
                  <span className="text-sm font-semibold text-main">
                    {selectedFeeding.foodTypes.join(', ')}
                  </span>
                </div>
              </div>
              {selectedFeeding.justification && (
                <div className="bg-theme-surface border border-strong rounded-lg p-3 col-span-2">
                  <p className="text-xs text-muted font-medium mb-1">Justificación</p>
                  <div className="flex flex-col leading-tight mt-1">
                    <span className="text-sm text-main">
                      {selectedFeeding.justification}
                    </span>
                  </div>
                </div>
              )}
            </>
          )
        }
      />
    </>
  );
}
