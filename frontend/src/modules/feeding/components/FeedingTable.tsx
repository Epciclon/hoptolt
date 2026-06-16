'use client';

import { useFeeding } from '../hooks/useFeeding';
import { Table, Badge } from '@/shared/ui';
import type { Column } from '@/shared/ui/Table';
import { formatDate } from '@/lib/utils';

export function FeedingTable() {
  const { feedings, loading, error } = useFeeding();

  const columns: Column<any>[] = [
    { 
      key: 'rabbitCode', 
      header: 'Código Conejo',
      render: (row) => `${row.rabbitCode}${row.rabbitName ? ` — ${row.rabbitName}` : ''}`
    },
    { 
      key: 'foodTypes', 
      header: 'Tipos de Alimento',
      render: (row) => row.foodTypes.join(', ')
    },
    { 
      key: 'feedingDate', 
      header: 'Fecha',
      render: (row) => formatDate(row.feedingDate)
    },
    { 
      key: 'justification', 
      header: 'Justificación',
      render: (row) => row.justification || '-'
    },
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
      />
    </>
  );
}
