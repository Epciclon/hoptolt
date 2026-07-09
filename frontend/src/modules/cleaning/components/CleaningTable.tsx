'use client';

import { useState } from 'react';
import type { Cleaning } from '../types/cleaning.types';
import { useCleaning } from '../hooks/useCleaning';
import { LoadingMessage, DateTimeBadge, EventDetailsModal } from '@/shared/ui';
import { Table, Column } from '@/shared/ui/Table';

export function CleaningTable() {
  const { cleanings, loading, error } = useCleaning();
  const [selectedCleaning, setSelectedCleaning] = useState<Cleaning | null>(null);

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
      render: (row) => <DateTimeBadge dateString={row.cleaningDate} />
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

      <EventDetailsModal
        open={!!selectedCleaning}
        onClose={() => setSelectedCleaning(null)}
        title="Detalles de Limpieza"
        description="Información detallada sobre el registro de limpieza"
        primaryDateString={selectedCleaning?.cleaningDate}
        primaryDateLabel="Fecha y Hora de Limpieza"
        profile={selectedCleaning?.profile}
        rabbits={selectedCleaning?.rabbits}
        cageNumber={selectedCleaning?.cageNumber}
      />
    </>
  );
}
